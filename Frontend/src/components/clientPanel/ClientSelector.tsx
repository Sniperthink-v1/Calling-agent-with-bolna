import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { authenticatedFetch } from '@/utils/auth';

interface User {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string;
}

interface ClientSelectorProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedUserId,
  onSelectUser,
}) => {
  const [open, setOpen] = useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['client-panel-users'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/admin/client-panel/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data as User[];
    },
  });

  const users = usersData || [];
  const selectedUser = users.find(u => u.id === selectedUserId);

  const getDisplayName = (user: User | undefined) => {
    if (!user) return 'All Clients';
    return user.company 
      ? `${user.name} (${user.company})` 
      : user.name;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="truncate">
              {getDisplayName(selectedUser)}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandEmpty>No client found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {/* All Clients Option */}
            <CommandItem
              value="all-clients"
              onSelect={() => {
                onSelectUser(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4',
                  selectedUserId === null ? 'opacity-100' : 'opacity-0'
                )}
              />
              <div className="flex flex-col">
                <span className="font-semibold">All Clients</span>
                <span className="text-xs text-gray-500">
                  Aggregate data across all users
                </span>
              </div>
            </CommandItem>

            {/* Individual Users */}
            {users.map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.name} ${user.email} ${user.company || ''}`}
                onSelect={() => {
                  onSelectUser(user.id === selectedUserId ? null : user.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-gray-500">
                    {user.email}
                    {user.company && ` • ${user.company}`}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientSelector;
