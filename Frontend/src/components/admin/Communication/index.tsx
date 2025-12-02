import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Megaphone, Ticket, Bell, Mail } from 'lucide-react';
import { UserMessaging } from './UserMessaging';
import { BroadcastAnnouncements } from './BroadcastAnnouncements';
import { SupportTickets } from './SupportTickets';
import { NotificationManagement } from './NotificationManagement';
import { AdminUserEmailSettings } from '../AdminUserEmailSettings';

export const Communication: React.FC = () => {
  const [activeTab, setActiveTab] = useState('messaging');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Communication & Support</h1>
        <p className="text-muted-foreground">
          Manage user communications, announcements, and support tickets
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">User Messaging</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Support Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="email-settings" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Messaging</CardTitle>
              <CardDescription>
                Send direct messages to users and track delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserMessaging />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast Announcements</CardTitle>
              <CardDescription>
                Send announcements to all users or specific segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BroadcastAnnouncements />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>
                Manage and respond to user support requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupportTickets />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <CardDescription>
                Configure admin notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-settings" className="space-y-4">
          <AdminUserEmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Communication;