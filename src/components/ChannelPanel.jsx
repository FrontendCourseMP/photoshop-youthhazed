import ChannelThumbnail from "./ChannelThumbnail.jsx";

// Панель каналов: миниатюра каждого канала + явная индикация вкл/выкл.
// Клик по карточке переключает отображение канала на главном холсте.
export default function ChannelPanel({ source, descriptors, channels, onToggle }) {
  if (!descriptors.length) {
    return <p className="note">Каналы появятся после открытия файла.</p>;
  }

  return (
    <div className="channel-grid">
      {descriptors.map((descriptor) => {
        const isOn = channels[descriptor.id];

        return (
          <button
            key={descriptor.id}
            type="button"
            className={`channel-card ${isOn ? "on" : "off"}`}
            onClick={() => onToggle(descriptor.id)}
            aria-pressed={isOn}
          >
            <span className="channel-thumb-box">
              <ChannelThumbnail source={source} channelId={descriptor.id} />
            </span>
            <span className="channel-card-info">
              <span className="channel-dot" aria-hidden="true" />
              <span className="channel-card-label">{descriptor.label}</span>
              <span className="channel-card-state">{isOn ? "вкл" : "выкл"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
