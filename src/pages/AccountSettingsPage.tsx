import React from 'react';
import { Layout } from '../components/Layout';
import { UserProfile } from '../components/auth/UserProfile';

export const AccountSettingsPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <UserProfile />
      </div>
    </Layout>
  );
};