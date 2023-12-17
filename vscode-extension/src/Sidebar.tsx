import './base.css';
import { GrabPane } from './components/GrabPane';
import { DropPane } from './components/DropPane';

export function Sidebar() {
  return (
    <div style={{ width: '100%', padding: '0.5em' }}>
      <DropPane />
      <GrabPane />
    </div>
  );
}
