import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContacts, useDeleteContact } from '../../hooks/useContacts';
import { COLORS, SIZES } from '../../constants/theme';
import { getInitials, generateAvatarColor } from '../../utils/helpers';
import { InitiateCallModal } from '../../components/InitiateCallModal';
import { AddContactModal } from '../../components/AddContactModal';
import { CreateCampaignModal } from '../../components/CreateCampaignModal';
import type { Contact } from '../../types';

export default function ContactsScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [contactToCall, setContactToCall] = useState<Contact | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [page, setPage] = useState(0);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;
  
  const { data, isLoading, refetch, isFetching } = useContacts({
    limit,
    offset: page * limit,
  });
  const deleteContact = useDeleteContact();

  console.log('👥 Contacts screen - data:', data);

  // Update allContacts when new data arrives
  React.useEffect(() => {
    if (data?.data) {
      if (page === 0) {
        setAllContacts(data.data);
      } else {
        setAllContacts(prev => [...prev, ...data.data]);
      }
      setHasMore(data.data.length === limit);
    }
  }, [data]);

  const handleLoadMore = () => {
    if (!isFetching && hasMore && !searchQuery) {
      setPage(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(0);
    setAllContacts([]);
    refetch();
  };

  const filteredContacts = searchQuery
    ? allContacts.filter(
        (contact: Contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone_number.includes(searchQuery) ||
          contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allContacts;

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteContact.mutate(contact.id, {
              onSuccess: () => {
                Alert.alert('Success', 'Contact deleted successfully');
              },
              onError: (error: any) => {
                Alert.alert('Error', error.message || 'Failed to delete contact');
              },
            });
          },
        },
      ]
    );
  };

  const toggleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
    
    // Exit selection mode if no contacts selected
    if (newSelected.size === 0) {
      setSelectionMode(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
      setSelectionMode(false);
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
      setSelectionMode(true);
    }
  };

  const handleInitiateCall = (contact: Contact) => {
    setContactToCall(contact);
    setShowCallModal(true);
  };

  const handleCallInitiated = (callId: string) => {
    console.log('📞 Call initiated with ID:', callId);
    Alert.alert('Success', 'Call has been initiated successfully');
    setShowCallModal(false);
    setContactToCall(null);
  };

  const handleBulkAction = (action: 'campaign' | 'delete') => {
    const count = selectedContacts.size;
    
    if (action === 'campaign') {
      setShowActionMenu(false);
      setShowCreateCampaignModal(true);
    } else if (action === 'delete') {
      Alert.alert(
        'Delete Contacts',
        `Are you sure you want to delete ${count} contact${count > 1 ? 's' : ''}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              // TODO: Implement bulk delete
              Alert.alert('Bulk Delete', 'Bulk delete feature coming soon');
              setShowActionMenu(false);
              setSelectedContacts(new Set());
              setSelectionMode(false);
            },
          },
        ]
      );
    }
  };

  const renderContactCard = ({ item }: { item: Contact }) => {
    const avatarColor = generateAvatarColor(item.name);
    const isSelected = selectedContacts.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.contactCard, isSelected && styles.contactCardSelected]} 
        activeOpacity={0.7}
        onLongPress={() => {
          setSelectionMode(true);
          toggleSelectContact(item.id);
        }}
        onPress={() => {
          if (selectionMode) {
            toggleSelectContact(item.id);
          } else {
            // TODO: Navigate to contact details
          }
        }}
      >
        {selectionMode && (
          <View style={styles.checkbox}>
            <Ionicons 
              name={isSelected ? 'checkbox' : 'square-outline'} 
              size={24} 
              color={isSelected ? COLORS.primary : COLORS.textSecondary} 
            />
          </View>
        )}
        
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.is_auto_created && (
              <View style={styles.autoBadge}>
                <Ionicons name="flash" size={10} color={COLORS.warning} />
                <Text style={styles.autoText}>Auto</Text>
              </View>
            )}
          </View>
          <Text style={styles.phoneNumber}>{item.phone_number}</Text>
          {item.email && (
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={12} color={COLORS.textLight} />
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          )}
          {item.company && (
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={12} color={COLORS.textLight} />
              <Text style={styles.company} numberOfLines={1}>
                {item.company}
              </Text>
            </View>
          )}
        </View>

        {!selectionMode && (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleInitiateCall(item)}
          >
            <Ionicons name="call" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
      <Text style={styles.emptyText}>No contacts yet</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'No contacts match your search' : 'Add your first contact to get started'}
      </Text>
    </View>
  );

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selection Toolbar */}
      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <TouchableOpacity onPress={() => {
            setSelectionMode(false);
            setSelectedContacts(new Set());
          }}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedContacts.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={toggleSelectAll}
            >
              <Text style={styles.selectionButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={() => setShowActionMenu(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      {!selectionMode && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contact Count */}
      {!selectionMode && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContactCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching && page > 0 && !searchQuery ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ padding: 16 }} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 0}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      />

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleBulkAction('campaign')}
            >
              <Ionicons name="megaphone" size={20} color={COLORS.text} />
              <Text style={styles.actionMenuText}>Create Campaign</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
              onPress={() => handleBulkAction('delete')}
            >
              <Ionicons name="trash" size={20} color={COLORS.error} />
              <Text style={[styles.actionMenuText, { color: COLORS.error }]}>Delete Selected</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Initiate Call Modal */}
      <InitiateCallModal
        visible={showCallModal}
        contact={contactToCall}
        onClose={() => {
          setShowCallModal(false);
          setContactToCall(null);
        }}
        onCallInitiated={handleCallInitiated}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        visible={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        onContactCreated={() => {
          refetch();
        }}
      />

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        visible={showCreateCampaignModal}
        onClose={() => setShowCreateCampaignModal(false)}
        contactIds={Array.from(selectedContacts)}
        onSuccess={() => {
          setSelectedContacts(new Set());
          setSelectionMode(false);
          refetch();
        }}
      />

      {/* Add Contact FAB */}
      {!selectionMode && (
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.8}
          onPress={() => setShowAddContactModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SIZES.paddingMD,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: SIZES.radiusLG,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SIZES.paddingSM,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  countContainer: {
    paddingHorizontal: SIZES.paddingMD,
    paddingBottom: SIZES.paddingSM,
  },
  countText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: SIZES.paddingMD,
    paddingBottom: 80, // Space for FAB
  },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionCount: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: SIZES.paddingSM,
  },
  selectionButton: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
  },
  selectionButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactCardSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  checkbox: {
    marginRight: SIZES.paddingSM,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  avatarText: {
    color: '#fff',
    fontSize: SIZES.lg,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
    marginLeft: SIZES.paddingSM,
  },
  autoText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.warning,
    marginLeft: 2,
  },
  phoneNumber: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  email: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  company: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.paddingSM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenu: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radiusLG,
    borderTopRightRadius: SIZES.radiusLG,
    padding: SIZES.paddingLG,
    paddingBottom: SIZES.paddingXL,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.paddingMD,
    gap: SIZES.paddingMD,
  },
  actionMenuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionMenuText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.paddingXL * 2,
  },
  emptyText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SIZES.paddingLG,
  },
  emptySubtext: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingSM,
    textAlign: 'center',
    paddingHorizontal: SIZES.paddingXL,
  },
  fab: {
    position: 'absolute',
    right: SIZES.paddingLG,
    bottom: SIZES.paddingLG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
