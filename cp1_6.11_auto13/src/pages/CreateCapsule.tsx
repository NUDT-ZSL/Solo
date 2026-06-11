import CreateForm from '../components/CreateForm';

interface Props {
  onCreated: () => void;
}

export default function CreateCapsule({ onCreated }: Props) {
  return (
    <div className="create-page">
      <div className="page-header center">
        <h2 className="page-title">✍️ 创建新的时间胶囊</h2>
        <p className="page-subtitle">写下此刻的心情，寄给未来的自己</p>
      </div>
      <CreateForm onCreated={onCreated} />
    </div>
  );
}
