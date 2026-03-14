import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { useState } from 'react';
import { FlowChart } from './FlowChart';
import type { iFlowDefinition, iFlowNode } from './types';

const meta: Meta<typeof FlowChart> = {
  title: 'Components/FlowChart',
  component: FlowChart,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    onNodeClick: action('onNodeClick'),
    onPathChange: action('onPathChange'),
  },
  argTypes: {
    pathDrawerPosition: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FlowChart>;

const simpleFlow: iFlowDefinition = {
  id: 'simple-flow',
  name: 'Simple Flow',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'action1', label: 'Process Data', type: 'action' },
    { id: 'end', label: 'End', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'action1', type: 'happy' },
    { from: 'action1', to: 'end', type: 'happy' },
  ],
};

const decisionFlow: iFlowDefinition = {
  id: 'decision-flow',
  name: 'Decision Flow',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'check', label: 'Valid?', type: 'decision' },
    { id: 'success', label: 'Process', type: 'action' },
    { id: 'error', label: 'Handle Error', type: 'error' },
    { id: 'end', label: 'End', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'check', type: 'default' },
    { from: 'check', to: 'success', type: 'happy', label: 'Yes' },
    { from: 'check', to: 'error', type: 'error', label: 'No' },
    { from: 'success', to: 'end', type: 'happy' },
    { from: 'error', to: 'end', type: 'error' },
  ],
};

const complexFlow: iFlowDefinition = {
  id: 'complex-flow',
  name: 'User Registration Flow',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'input', label: 'Enter Details', type: 'action' },
    { id: 'validate', label: 'Valid?', type: 'decision' },
    { id: 'check-email', label: 'Email exists?', type: 'decision' },
    { id: 'create-user', label: 'Create User', type: 'action' },
    { id: 'send-email', label: 'Send Welcome', type: 'action' },
    { id: 'validation-error', label: 'Show Errors', type: 'warning' },
    { id: 'email-exists', label: 'Already Registered', type: 'error' },
    { id: 'success', label: 'Success', type: 'end' },
    { id: 'failure', label: 'Failed', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'input', type: 'default' },
    { from: 'input', to: 'validate', type: 'default' },
    { from: 'validate', to: 'check-email', type: 'happy', label: 'Yes' },
    { from: 'validate', to: 'validation-error', type: 'warning', label: 'No' },
    { from: 'validation-error', to: 'input', type: 'warning' },
    { from: 'check-email', to: 'create-user', type: 'happy', label: 'No' },
    { from: 'check-email', to: 'email-exists', type: 'error', label: 'Yes' },
    { from: 'create-user', to: 'send-email', type: 'happy' },
    { from: 'send-email', to: 'success', type: 'happy' },
    { from: 'email-exists', to: 'failure', type: 'error' },
  ],
};

const loginFlow: iFlowDefinition = {
  id: 'login-flow',
  name: 'User Login',
  nodes: [
    { id: 'A', label: 'Start', type: 'start' },
    { id: 'B', label: 'User visits login page', type: 'action' },
    { id: 'C', label: 'Login method?', type: 'decision' },
    { id: 'D', label: 'Enter credentials', type: 'action' },
    { id: 'E', label: 'Valid credentials?', type: 'decision' },
    { id: 'F', label: 'Show error message', type: 'error' },
    { id: 'G', label: 'Check email verified?', type: 'decision' },
    { id: 'H', label: 'Redirect to provider', type: 'action' },
    { id: 'I', label: 'User authorizes', type: 'action' },
    { id: 'J', label: 'Authorization successful?', type: 'decision' },
    { id: 'K', label: 'Show error, return to login', type: 'error' },
    { id: 'L', label: 'Get user profile from provider', type: 'action' },
    { id: 'M', label: 'Send verification email', type: 'action' },
    { id: 'N', label: 'Show verification required message', type: 'action' },
    { id: 'O', label: 'End - Awaiting verification', type: 'end' },
    { id: 'P', label: 'Create session', type: 'action' },
    { id: 'Q', label: 'User exists?', type: 'decision' },
    { id: 'R', label: 'Create user account', type: 'action' },
    { id: 'S', label: 'Set auth cookies', type: 'action' },
    { id: 'T', label: 'Redirect to dashboard', type: 'action' },
    { id: 'U', label: 'End - Logged in', type: 'end' },
  ],
  edges: [
    { from: 'A', to: 'B', type: 'default' },
    { from: 'B', to: 'C', type: 'default' },
    { from: 'C', to: 'D', type: 'default', label: 'Email/Pass' },
    { from: 'D', to: 'E', type: 'default' },
    { from: 'E', to: 'F', type: 'error', label: 'No' },
    { from: 'F', to: 'D', type: 'error' },
    { from: 'E', to: 'G', type: 'happy', label: 'Yes' },
    { from: 'C', to: 'H', type: 'default', label: 'Social' },
    { from: 'H', to: 'I', type: 'default' },
    { from: 'I', to: 'J', type: 'default' },
    { from: 'J', to: 'K', type: 'error', label: 'No' },
    { from: 'K', to: 'B', type: 'error' },
    { from: 'J', to: 'L', type: 'happy', label: 'Yes' },
    { from: 'G', to: 'M', type: 'warning', label: 'No' },
    { from: 'M', to: 'N', type: 'default' },
    { from: 'N', to: 'O', type: 'default' },
    { from: 'G', to: 'P', type: 'happy', label: 'Yes' },
    { from: 'L', to: 'Q', type: 'default' },
    { from: 'Q', to: 'R', type: 'default', label: 'No' },
    { from: 'R', to: 'P', type: 'default' },
    { from: 'Q', to: 'P', type: 'happy', label: 'Yes' },
    { from: 'P', to: 'S', type: 'happy' },
    { from: 'S', to: 'T', type: 'happy' },
    { from: 'T', to: 'U', type: 'happy' },
  ],
};

const paymentFlow: iFlowDefinition = {
  id: 'payment-flow',
  name: 'Payment Processing',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'select-method', label: 'Select Payment', type: 'action' },
    { id: 'method-check', label: 'Method?', type: 'decision' },
    { id: 'card-input', label: 'Enter Card', type: 'action' },
    { id: 'bank-input', label: 'Bank Transfer', type: 'action' },
    { id: 'wallet-input', label: 'Digital Wallet', type: 'action' },
    { id: 'process', label: 'Process Payment', type: 'action' },
    { id: 'verify', label: 'Verified?', type: 'decision' },
    { id: 'success', label: 'Complete', type: 'end' },
    { id: 'retry', label: 'Retry', type: 'warning' },
    { id: 'failed', label: 'Failed', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'select-method', type: 'default' },
    { from: 'select-method', to: 'method-check', type: 'default' },
    { from: 'method-check', to: 'card-input', type: 'happy', label: 'Card' },
    { from: 'method-check', to: 'bank-input', type: 'default', label: 'Bank' },
    { from: 'method-check', to: 'wallet-input', type: 'default', label: 'Wallet' },
    { from: 'card-input', to: 'process', type: 'happy' },
    { from: 'bank-input', to: 'process', type: 'default' },
    { from: 'wallet-input', to: 'process', type: 'default' },
    { from: 'process', to: 'verify', type: 'default' },
    { from: 'verify', to: 'success', type: 'happy', label: 'Yes' },
    { from: 'verify', to: 'retry', type: 'warning', label: 'Retry' },
    { from: 'verify', to: 'failed', type: 'error', label: 'No' },
    { from: 'retry', to: 'process', type: 'warning' },
  ],
};

export const Simple: Story = {
  args: {
    flow: simpleFlow,
  },
};

export const WithDecision: Story = {
  args: {
    flow: decisionFlow,
  },
};

export const Complex: Story = {
  args: {
    flow: complexFlow,
  },
};

export const PaymentProcess: Story = {
  args: {
    flow: paymentFlow,
  },
};

export const UserLogin: Story = {
  args: {
    flow: loginFlow,
  },
};

const onNodeClickAction = action('onNodeClick');
const onPathChangeAction = action('onPathChange');

export const WithPathSelection: Story = {
  render: () => {
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

    const handlePathChange = (pathId: string | null) => {
      onPathChangeAction(pathId);
      setSelectedPathId(pathId);
    };

    return (
      <FlowChart
        flow={complexFlow}
        selectedPathId={selectedPathId}
        onPathChange={handlePathChange}
        onNodeClick={onNodeClickAction}
      />
    );
  },
};

export const WithActiveNode: Story = {
  render: () => {
    const [activeNodeId, setActiveNodeId] = useState<string>('validate');

    const handleNodeClick = (node: iFlowNode) => {
      onNodeClickAction(node);
      setActiveNodeId(node.id);
    };

    return (
      <FlowChart
        flow={complexFlow}
        activeNodeId={activeNodeId}
        onNodeClick={handleNodeClick}
        onPathChange={onPathChangeAction}
      />
    );
  },
};

export const InteractiveDemo: Story = {
  render: () => {
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
    const [activeNodeId, setActiveNodeId] = useState<string | undefined>();

    const handleNodeClick = (node: iFlowNode) => {
      onNodeClickAction(node);
      setActiveNodeId(node.id);
    };

    const handlePathChange = (pathId: string | null) => {
      onPathChangeAction(pathId);
      setSelectedPathId(pathId);
    };

    return (
      <FlowChart
        flow={paymentFlow}
        selectedPathId={selectedPathId}
        onPathChange={handlePathChange}
        activeNodeId={activeNodeId}
        onNodeClick={handleNodeClick}
      />
    );
  },
};

export const DrawerPositionTop: Story = {
  render: () => {
    const [selectedPathId, setSelectedPathId] = useState<string | null>('path-1');

    const handlePathChange = (pathId: string | null) => {
      onPathChangeAction(pathId);
      setSelectedPathId(pathId);
    };

    return (
      <FlowChart
        flow={decisionFlow}
        selectedPathId={selectedPathId}
        onPathChange={handlePathChange}
        onNodeClick={onNodeClickAction}
        pathDrawerPosition="top"
      />
    );
  },
};

export const DrawerPositionBottom: Story = {
  render: () => {
    const [selectedPathId, setSelectedPathId] = useState<string | null>('path-1');

    const handlePathChange = (pathId: string | null) => {
      onPathChangeAction(pathId);
      setSelectedPathId(pathId);
    };

    return (
      <FlowChart
        flow={decisionFlow}
        selectedPathId={selectedPathId}
        onPathChange={handlePathChange}
        onNodeClick={onNodeClickAction}
        pathDrawerPosition="bottom"
      />
    );
  },
};

export const DrawerPositionLeft: Story = {
  render: () => {
    const [selectedPathId, setSelectedPathId] = useState<string | null>('path-1');

    const handlePathChange = (pathId: string | null) => {
      onPathChangeAction(pathId);
      setSelectedPathId(pathId);
    };

    return (
      <FlowChart
        flow={decisionFlow}
        selectedPathId={selectedPathId}
        onPathChange={handlePathChange}
        onNodeClick={onNodeClickAction}
        pathDrawerPosition="left"
      />
    );
  },
};

export const CustomLayout: Story = {
  args: {
    flow: simpleFlow,
    config: {
      nodeWidth: 200,
      nodeHeight: 80,
      horizontalSpacing: 200,
      verticalSpacing: 150,
      padding: 150,
    },
  },
};
