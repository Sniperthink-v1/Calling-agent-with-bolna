import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { googleCalendarService } from '../services/googleCalendarService';

const router = Router();

/**
 * GET /api/demos/scheduled
 * Get all scheduled demos for the authenticated user
 */
router.get('/scheduled', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user as any)?.id;
    const { 
      status, // upcoming, completed, cancelled, no-show, all
      dateFrom,
      dateTo,
      leadQuality, // hot, warm, cold
      agentId,
      limit = 100,
      offset = 0
    } = req.query;

    // Debug log to see what we're querying
    logger.info('Fetching scheduled demos:', { 
      userId, 
      status, 
      dateFrom, 
      dateTo, 
      leadQuality, 
      agentId 
    });

    // First, let's check if there's ANY data in calendar_meetings
    const checkQuery = `SELECT COUNT(*) as total, 
                        COUNT(DISTINCT user_id) as unique_users,
                        MIN(meeting_start_time) as earliest,
                        MAX(meeting_start_time) as latest
                        FROM calendar_meetings`;
    const checkResult = await pool.query(checkQuery);
    logger.info('Calendar meetings check:', checkResult.rows[0]);

    let query = `
      SELECT 
        cm.id,
        COALESCE(cm.attendee_name, la.extracted_name, ct.name, c.phone_number) as lead_name,
        c.phone_number,
        COALESCE(cm.attendee_email, la.extracted_email, ct.email) as email,
        COALESCE(la.company_name, ct.company) as company,
        cm.meeting_start_time as demo_scheduled_at,
        cm.meeting_link,
        la.total_score as lead_score,
        la.lead_status_tag as lead_quality,
        la.lead_status_tag as lead_status_tag,
        ag.name as agent_name,
        la.smart_notification as notes,
        la.call_id,
        cm.contact_id,
        cm.status as demo_status,
        cm.meeting_title,
        cm.meeting_end_time,
        cm.timezone,
        cm.created_at,
        cm.user_id,
        c.user_id as call_user_id
      FROM calendar_meetings cm
      LEFT JOIN lead_analytics la ON cm.lead_analytics_id = la.id
      LEFT JOIN calls c ON cm.call_id = c.id
      LEFT JOIN contacts ct ON cm.contact_id = ct.id
      LEFT JOIN agents ag ON c.agent_id = ag.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Add user filter
    if (userId) {
      query += ` AND (cm.user_id = $${paramIndex} OR c.user_id = $${paramIndex})`;
      params.push(userId);
      paramIndex++;
    }

    // Apply filters
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        query += ` AND cm.meeting_start_time >= NOW() AND cm.status = 'scheduled'`;
      } else if (status === 'past' || status === 'completed') {
        query += ` AND cm.meeting_start_time < NOW()`;
      } else if (status === 'cancelled') {
        query += ` AND cm.status = 'cancelled'`;
      }
    }

    if (dateFrom) {
      query += ` AND cm.meeting_start_time >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND cm.meeting_start_time <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (leadQuality && leadQuality !== 'all') {
      query += ` AND LOWER(la.lead_status_tag) = $${paramIndex}`;
      params.push(String(leadQuality).toLowerCase());
      paramIndex++;
    }

    if (agentId) {
      query += ` AND c.agent_id = $${paramIndex}`;
      params.push(agentId);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY cm.meeting_start_time DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Debug log
    logger.info('Query result:', { 
      rowCount: result.rows.length,
      query: query.substring(0, 200),
      params,
      sampleRow: result.rows[0]
    });

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM calendar_meetings cm
      LEFT JOIN lead_analytics la ON cm.lead_analytics_id = la.id
      LEFT JOIN calls c ON cm.call_id = c.id
      WHERE 1=1
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // Add user filter
    if (userId) {
      countQuery += ` AND (cm.user_id = $${countParamIndex} OR c.user_id = $${countParamIndex})`;
      countParams.push(userId);
      countParamIndex++;
    }

    if (status && status !== 'all') {
      if (status === 'upcoming') {
        countQuery += ` AND cm.meeting_start_time >= NOW() AND cm.status = 'scheduled'`;
      } else if (status === 'past' || status === 'completed') {
        countQuery += ` AND cm.meeting_start_time < NOW()`;
      } else if (status === 'cancelled') {
        countQuery += ` AND cm.status = 'cancelled'`;
      }
    }

    if (dateFrom) {
      countQuery += ` AND cm.meeting_start_time >= $${countParamIndex}`;
      countParams.push(dateFrom);
      countParamIndex++;
    }

    if (dateTo) {
      countQuery += ` AND cm.meeting_start_time <= $${countParamIndex}`;
      countParams.push(dateTo);
      countParamIndex++;
    }

    if (leadQuality && leadQuality !== 'all') {
      countQuery += ` AND LOWER(la.lead_status_tag) = $${countParamIndex}`;
      countParams.push(String(leadQuality).toLowerCase());
      countParamIndex++;
    }

    if (agentId) {
      countQuery += ` AND c.agent_id = $${countParamIndex}`;
      countParams.push(agentId);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    logger.error('Error fetching scheduled demos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled demos',
    });
  }
});

/**
 * GET /api/demos/stats
 * Get demo statistics for the authenticated user
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user as any)?.id;
    const { dateFrom, dateTo, agentId } = req.query;

    let query = `
      SELECT 
        COUNT(*) FILTER (WHERE cm.meeting_start_time >= NOW() AND cm.status = 'scheduled') as upcoming_count,
        COUNT(*) FILTER (WHERE cm.meeting_start_time < NOW()) as past_count,
        COUNT(*) FILTER (WHERE cm.status = 'cancelled') as cancelled_count,
        COUNT(*) as total_demos
      FROM calendar_meetings cm
      LEFT JOIN calls c ON cm.call_id = c.id
      WHERE cm.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (dateFrom) {
      query += ` AND cm.meeting_start_time >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND cm.meeting_start_time <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (agentId) {
      query += ` AND c.agent_id = $${paramIndex}`;
      params.push(agentId);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching demo stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch demo statistics',
    });
  }
});

/**
 * PATCH /api/demos/:id/reschedule
 * Reschedule a demo to a new date/time
 */
router.patch('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user as any)?.id;
    const { id } = req.params;
    const { rescheduled_to } = req.body;

    if (!rescheduled_to) {
      return res.status(400).json({
        success: false,
        error: 'New demo date/time is required',
      });
    }

    // Verify ownership and get meeting details
    const checkQuery = `
      SELECT cm.*, 
             EXTRACT(EPOCH FROM (cm.meeting_end_time - cm.meeting_start_time)) as duration_seconds
      FROM calendar_meetings cm
      WHERE cm.id = $1 AND cm.user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Demo not found',
      });
    }

    const meeting = checkResult.rows[0];
    const durationSeconds = meeting.duration_seconds || 1800; // Default 30 minutes
    const oldStartTime = new Date(meeting.meeting_start_time);

    // Calculate new end time
    const newStartTime = new Date(rescheduled_to);
    const newEndTime = new Date(newStartTime.getTime() + durationSeconds * 1000);

    // Update database - change status back to 'scheduled' if it was cancelled
    const updateQuery = `
      UPDATE calendar_meetings 
      SET meeting_start_time = $1, 
          meeting_end_time = $2,
          status = 'scheduled',
          updated_at = NOW()
      WHERE id = $3 
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [newStartTime.toISOString(), newEndTime.toISOString(), id]);

    // Update Google Calendar if event ID exists
    let updatedGoogleEvent = null;
    if (meeting.google_event_id) {
      try {
        // First check if the existing event is cancelled
        const existingEvent = await googleCalendarService.getEvent(
          userId,
          meeting.google_event_id,
          meeting.google_calendar_id || 'primary'
        );
        
        // If event is cancelled, we must create a new one (can't update cancelled events)
        if (existingEvent && existingEvent.status === 'cancelled') {
          logger.info('Event is cancelled, creating new event instead of updating', { oldEventId: meeting.google_event_id });
          
          const newEvent = await googleCalendarService.createEvent(userId, {
            calendarId: meeting.google_calendar_id || 'primary',
            summary: `${meeting.meeting_title || 'Demo Meeting'} (Rescheduled)`,
            description: `Rescheduled from previous meeting. ${meeting.meeting_description || ''}`,
            startTime: newStartTime,
            endTime: newEndTime,
            attendees: meeting.attendee_email ? [{
              email: meeting.attendee_email,
              name: meeting.attendee_name || meeting.attendee_email
            }] : [],
            timeZone: meeting.timezone || 'UTC',
            sendNotifications: true
          });

          // Update database with new event ID, meeting link, and API response
          if (newEvent.id) {
            await pool.query(
              `UPDATE calendar_meetings 
               SET google_event_id = $1, 
                   meeting_link = $2,
                   meeting_title = $3,
                   google_api_response = $4
               WHERE id = $5`,
              [
                newEvent.id,
                newEvent.hangoutLink || meeting.meeting_link,
                `${meeting.meeting_title || 'Demo Meeting'} (Rescheduled)`,
                JSON.stringify(newEvent),
                id
              ]
            );
            updatedGoogleEvent = newEvent;
            logger.info('New Google Calendar event created for cancelled meeting', { 
              oldEventId: meeting.google_event_id,
              newEventId: newEvent.id,
              meetingLink: newEvent.hangoutLink 
            });
          }
        } else {
          // Event is active, try to update it
          updatedGoogleEvent = await googleCalendarService.updateEvent(
            userId,
            meeting.google_event_id,
            {
              calendarId: meeting.google_calendar_id || 'primary',
              startTime: newStartTime,
              endTime: newEndTime,
              sendNotifications: true
            }
          );
          
          // Update google_api_response in database with new event data
          await pool.query(
            `UPDATE calendar_meetings 
             SET google_api_response = $1
             WHERE id = $2`,
            [JSON.stringify(updatedGoogleEvent), id]
          );
          
          logger.info('Google Calendar event rescheduled', { eventId: meeting.google_event_id });
        }
      } catch (error: any) {
        // If event doesn't exist (was deleted), create a new one
        if (error?.code === 'CALENDAR_EVENT_NOT_FOUND' || error?.message?.includes('not found') || error?.originalError?.code === 404) {
          logger.info('Original event not found, creating new event', { oldEventId: meeting.google_event_id });
          
          try {
            const newEvent = await googleCalendarService.createEvent(userId, {
              calendarId: meeting.google_calendar_id || 'primary',
              summary: `${meeting.meeting_title || 'Demo Meeting'} (Rescheduled)`,
              description: `Rescheduled meeting with ${meeting.attendee_name || 'attendee'}. ${meeting.meeting_description || ''}`,
              startTime: newStartTime,
              endTime: newEndTime,
              attendees: meeting.attendee_email ? [{
                email: meeting.attendee_email,
                name: meeting.attendee_name || meeting.attendee_email
              }] : [],
              timeZone: meeting.timezone || 'UTC',
              sendNotifications: true
            });

            // Update database with new event ID, meeting link, and API response
            if (newEvent.id) {
              await pool.query(
                `UPDATE calendar_meetings 
                 SET google_event_id = $1, 
                     meeting_link = $2,
                     meeting_title = $3,
                     google_api_response = $4
                 WHERE id = $5`,
                [
                  newEvent.id,
                  newEvent.hangoutLink || meeting.meeting_link,
                  `${meeting.meeting_title || 'Demo Meeting'} (Rescheduled)`,
                  JSON.stringify(newEvent),
                  id
                ]
              );
              updatedGoogleEvent = newEvent;
              logger.info('New Google Calendar event created for rescheduled meeting', { 
                newEventId: newEvent.id,
                meetingLink: newEvent.hangoutLink 
              });
            }
          } catch (createError) {
            logger.warn('Failed to create new Google Calendar event, continuing anyway', { error: createError });
          }
        } else {
          logger.warn('Failed to update Google Calendar event, continuing anyway', { error });
        }
      }
    }

    // Send reschedule email to attendee
    if (meeting.attendee_email) {
      try {
        await emailService.sendDemoReschedule({
          leadEmail: meeting.attendee_email,
          leadName: meeting.attendee_name || 'there',
          oldMeetingTime: oldStartTime,
          newMeetingTime: newStartTime,
          meetingLink: meeting.meeting_link || '',
          meetingTitle: meeting.meeting_title,
        });
        logger.info('Reschedule email sent', { to: meeting.attendee_email });
      } catch (error) {
        logger.warn('Failed to send reschedule email, continuing anyway', { error });
      }
    }

    // Fetch updated meeting data to return
    const finalQuery = `SELECT * FROM calendar_meetings WHERE id = $1`;
    const finalResult = await pool.query(finalQuery, [id]);

    return res.json({
      success: true,
      data: finalResult.rows[0],
      message: 'Demo rescheduled successfully. Notification email sent.',
    });
  } catch (error) {
    logger.error('Error rescheduling demo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reschedule demo',
    });
  }
});

/**
 * DELETE /api/demos/:id
 * Cancel/delete a demo
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user as any)?.id;
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // Verify ownership and get meeting details for email
    const checkQuery = `
      SELECT cm.*,
             COALESCE(cm.attendee_name, la.extracted_name, ct.name) as lead_name,
             COALESCE(cm.attendee_email, la.extracted_email, ct.email) as email
      FROM calendar_meetings cm
      LEFT JOIN lead_analytics la ON cm.lead_analytics_id = la.id
      LEFT JOIN contacts ct ON cm.contact_id = ct.id
      WHERE cm.id = $1 AND cm.user_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Demo not found',
      });
    }

    const meeting = checkResult.rows[0];

    // Update status to cancelled
    const updateQuery = `
      UPDATE calendar_meetings 
      SET status = 'cancelled', 
          cancellation_reason = $1,
          updated_at = NOW()
      WHERE id = $2 
      RETURNING *
    `;

    await pool.query(updateQuery, [cancellation_reason || 'Cancelled by user', id]);

    // Cancel Google Calendar event if exists
    if (meeting.google_event_id) {
      try {
        await googleCalendarService.cancelEvent(
          userId,
          meeting.google_event_id,
          meeting.google_calendar_id || 'primary',
          true // Send notifications
        );
        logger.info('Google Calendar event cancelled', { eventId: meeting.google_event_id });
      } catch (error) {
        logger.warn('Failed to cancel Google Calendar event, continuing anyway', { error });
      }
    }

    // Send cancellation email to attendee if email exists
    if (meeting.email) {
      try {
        await emailService.sendDemoCancellation({
          leadEmail: meeting.email,
          leadName: meeting.lead_name || 'Valued Customer',
          meetingTime: new Date(meeting.meeting_start_time),
          meetingTitle: meeting.meeting_title,
          cancellationReason: cancellation_reason || 'The meeting has been cancelled.',
        });
        logger.info('Cancellation email sent', { email: meeting.email });
      } catch (error) {
        logger.warn('Failed to send cancellation email', { error });
      }
    }

    return res.json({
      success: true,
      message: 'Demo cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling demo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel demo',
    });
  }
});

/**
 * POST /api/demos/:id/send-reminder
 * Send reminder for upcoming demo
 */
router.post('/:id/send-reminder', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId || (req.user as any)?.id;
    const { id } = req.params;

    // Verify ownership and get demo details
    const query = `
      SELECT 
        cm.id,
        COALESCE(cm.attendee_name, la.extracted_name, ct.name, c.phone_number) as lead_name,
        COALESCE(cm.attendee_email, la.extracted_email, ct.email) as email,
        c.phone_number,
        cm.meeting_start_time,
        cm.meeting_link,
        cm.meeting_title
      FROM calendar_meetings cm
      LEFT JOIN lead_analytics la ON cm.lead_analytics_id = la.id
      LEFT JOIN calls c ON cm.call_id = c.id
      LEFT JOIN contacts ct ON cm.contact_id = ct.id
      WHERE cm.id = $1 AND cm.user_id = $2 AND cm.meeting_start_time >= NOW() AND cm.status = 'scheduled'
    `;
    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Upcoming demo not found',
      });
    }

    const demo = result.rows[0];

    // Check if email is available
    if (!demo.email) {
      return res.status(400).json({
        success: false,
        error: 'Lead email not available',
      });
    }

    // Send reminder email
    logger.info('Sending demo reminder:', {
      demo_id: id,
      lead_name: demo.lead_name,
      email: demo.email,
      phone: demo.phone_number,
      meeting_start_time: demo.meeting_start_time,
    });

    const emailSent = await emailService.sendDemoReminder({
      leadEmail: demo.email,
      leadName: demo.lead_name || 'Valued Customer',
      meetingTime: new Date(demo.meeting_start_time),
      meetingLink: demo.meeting_link,
      meetingTitle: demo.meeting_title,
    });

    if (!emailSent) {
      logger.warn('Failed to send demo reminder email:', { demo_id: id, email: demo.email });
      return res.status(500).json({
        success: false,
        error: 'Failed to send reminder email. Email service may not be configured.',
      });
    }

    // Update reminder sent status
    await pool.query(`
      UPDATE calendar_meetings 
      SET reminder_email_sent = true, 
          reminder_email_sent_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [id]);

    logger.info('Demo reminder sent successfully:', { demo_id: id, email: demo.email });

    return res.json({
      success: true,
      message: `Reminder sent successfully to ${demo.email}`,
    });
  } catch (error) {
    logger.error('Error sending demo reminder:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send demo reminder',
    });
  }
});

export default router;
