import { Home, Compass, PlusCircle, FolderOpen, Bookmark, Bell, BarChart3, ShieldCheck } from 'lucide-react';

/** One navigation definition shared by the desktop sidebar and the mobile menu. */
export const getNavSections = ({ isAuthenticated, isAdmin, unreadCount }) => [
  {
    label: 'Discover',
    items: [
      { label: 'Home', path: '/', icon: Home, end: true },
      { label: 'Explore prompts', path: '/explore', icon: Compass }
    ]
  },
  ...(isAuthenticated
    ? [
        {
          label: 'Your library',
          items: [
            { label: 'New prompt', path: '/create', icon: PlusCircle },
            { label: 'My prompts', path: '/my-prompts', icon: FolderOpen },
            { label: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
            { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null }
          ]
        }
      ]
    : []),
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
      ...(isAdmin ? [{ label: 'Admin', path: '/admin', icon: ShieldCheck }] : [])
    ]
  }
];
