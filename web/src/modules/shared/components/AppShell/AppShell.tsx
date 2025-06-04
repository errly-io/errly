import { useState } from 'react';
import { Burger, Group, AppShell, NavLink, Menu, Avatar, Text, UnstyledButton, rem, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  IconBug,
  IconApps,
  IconRocket,
  IconChartBar,
  IconBell,
  IconSettings,
  IconUser,
  IconLogin,
  IconLogout,
  IconChevronDown,
  IconSearch,
} from '@tabler/icons-react';


export function BasicAppShell({ children }: { readonly children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { data: session, status } = useSession();

  // Get current space from URL or use default
  const currentSpace = (params?.space as string) || 'default';

  // Search handler
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Redirect to search page with query parameter
      router.push(`/${currentSpace}/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { label: 'Issues', href: `/${currentSpace}/issues`, icon: IconBug, description: 'Encountered problems' },
    { label: 'Projects', href: `/${currentSpace}/projects`, icon: IconApps, description: 'Projects' },
    { label: 'Releases', href: `/${currentSpace}/releases`, icon: IconRocket },
    { label: 'Performance', href: `/${currentSpace}/performance`, icon: IconChartBar },
    { label: 'Alerts', href: `/${currentSpace}/alerts`, icon: IconBell },
    { label: 'Settings', href: `/${currentSpace}/settings`, icon: IconSettings },
    // If not authenticated, show sign in link in sidebar
    ...(status !== 'authenticated' ? [{ label: 'Sign In', href: '/auth/signin', icon: IconLogin, description: 'Sign in to your account' }] : []),
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header
        style={{ left: 'var(--app-shell-navbar-width, 0px)' }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group style={{ flex: 1, maxWidth: 400 }}>
            <TextInput
              placeholder="Search issues, projects, events..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{ flex: 1 }}
              styles={{
                input: {
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-3)',
                  '&:focus': {
                    borderColor: 'var(--mantine-color-blue-6)',
                  }
                }
              }}
            />
          </Group>

          {/* Profile in top right corner */}
          {status === 'authenticated' && session ? (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton
                  style={{
                    padding: rem(8),
                    borderRadius: rem(8),
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Group gap="sm">
                    <Avatar
                      src={session.user?.image}
                      size={32}
                      radius="xl"
                    >
                      {session.user?.name?.charAt(0) ?? session.user?.email?.charAt(0)}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {session.user?.name ?? 'User'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {session.user?.email}
                      </Text>
                    </div>
                    <IconChevronDown size={16} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconUser size={16} />}
                  onClick={() => router.push(`/${currentSpace}/profile`)}
                >
                  Profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={16} />}
                  onClick={() => router.push(`/${currentSpace}/settings`)}
                >
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={16} />}
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  color="red"
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Group gap="sm">
              <UnstyledButton
                onClick={() => router.push('/auth/signin')}
                style={{
                  padding: `${rem(8)} ${rem(16)}`,
                  borderRadius: rem(8),
                  border: '1px solid var(--mantine-color-gray-3)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Group gap="xs">
                  <IconLogin size={16} />
                  <Text size="sm">Sign In</Text>
                </Group>
              </UnstyledButton>
            </Group>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Navbar
        p="md"
        style={{ top: '0', height: '100vh' }}
      >
        <Group h="60px" px="md" justify="space-between">
          <Group gap="sm">
            <Text fw={700} size="xl" c="blue">Errly</Text>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <NavLink
              key={item.label}
              label={item.label}
              description={item.description}
              leftSection={<item.icon size={16} stroke={1.5} />}
              active={isActive}
              onClick={() => router.push(item.href)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}