import React from 'react';
import { Layout } from '../components/Layout';
import { PasswordChange } from '../components/auth/PasswordChange';

export const PasswordChangePage: React.FC = () => {
  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <PasswordChange />
      </div>
    </Layout>
  );
};