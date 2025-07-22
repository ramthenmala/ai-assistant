import React from 'react';
import { Layout, useLayout } from '../components/Layout';
import { EnhancedSplitChatContainer } from '../components/chat/EnhancedSplitChatContainer';
import { ATSContainer } from '../components/ats/ATSContainer';

function MainContent() {
  const { activeTab } = useLayout();
  
  switch (activeTab) {
    case 'ats':
      return <ATSContainer />;
    case 'sdlc':
    case 'comparison':
    case 'metrics':
    case 'chat':
    default:
      return (
        <div className="flex-1 flex flex-col h-full">
          <EnhancedSplitChatContainer className="h-full" />
        </div>
      );
  }
}

export const HomePage: React.FC = () => {
  return (
    <Layout>
      <MainContent />
    </Layout>
  );
};