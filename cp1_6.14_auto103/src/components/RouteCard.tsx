import type { Route } from '../http';

interface RouteCardProps {
  route: Route;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

function RouteCard({ route, onSelect, onToggleFavorite }: RouteCardProps) {
  const avgRating =
    route.reviews.length > 0
      ? route.reviews.reduce((sum, r) => sum + r.rating, 0) / route.reviews.length
      : 0;

  const firstPhoto = route.waypoints.find((w) => w.photos.length > 0)?.photos[0];

  return (
    <div className="route-card" onClick={onSelect}>
      <div className="route-card-cover">
        {firstPhoto ? (
          <img src={firstPhoto.thumbnail} alt={route.name} />
        ) : (
          <div className="route-card-placeholder">
            <span>🗺️</span>
          </div>
        )}
        <button
          className={`card-favorite ${route.isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          {route.isFavorite ? '★' : '☆'}
        </button>
      </div>
      <div className="route-card-body">
        <h3 className="route-card-title">{route.name}</h3>
        <p className="route-card-desc">{route.description}</p>
        <div className="route-card-meta">
          <span className="meta-item">📍 {route.waypoints.length} 个路点</span>
          <span className="meta-item">📝 {route.reviews.length} 条评价</span>
          {avgRating > 0 && (
            <span className="meta-item rating">
              {'★'.repeat(Math.round(avgRating))} {avgRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default RouteCard;
