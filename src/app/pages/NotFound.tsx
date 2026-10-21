import { useNavigate } from 'react-router';
import { Button, ErrorState } from '../components/ui';
import { Screen } from '../components/Layout';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Screen>
      <ErrorState title="Page not found" body="This page doesn't exist." actions={<Button onClick={() => navigate('/')}>Go home</Button>} />
    </Screen>
  );
}
