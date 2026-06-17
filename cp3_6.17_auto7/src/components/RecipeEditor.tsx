import type { Recipe, Version, Ingredient, Step } from '@/types';

interface RecipeEditorProps {
  recipe: Recipe | null;
  version: Version | null;
}

export default function RecipeEditor({ recipe, version }: RecipeEditorProps) {
  if (!recipe) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          color: '#999',
          fontSize: 14,
        }}
      >
        请选择或创建一个食谱
      </div>
    );
  }

  const ingredients: Ingredient[] = version?.ingredients || [];
  const steps: Step[] = version?.steps || [];
  const notes: string = version?.notes || '';

  return (
    <div
      style={{
        height: '100%',
        backgroundColor: 'white',
        overflowY: 'auto',
        padding: 24,
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--secondary)',
          marginBottom: 24,
          marginTop: 0,
        }}
      >
        {recipe.name}
      </h2>

      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#333',
            marginBottom: 12,
          }}
        >
          食材
        </h3>
        {ingredients.length === 0 ? (
          <div style={{ color: '#999', fontSize: 14 }}>暂无食材</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 8,
            }}
          >
            {ingredients.map((ing) => (
              <div
                key={ing.id}
                style={{
                  padding: 10,
                  backgroundColor: 'var(--step-bg)',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <span style={{ fontWeight: 500 }}>{ing.name}</span>
                <span style={{ color: '#666', marginLeft: 8 }}>
                  {ing.quantity} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#333',
            marginBottom: 12,
          }}
        >
          步骤
        </h3>
        {steps.length === 0 ? (
          <div style={{ color: '#999', fontSize: 14 }}>暂无步骤</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <div
                  key={step.id}
                  style={{
                    padding: 12,
                    backgroundColor: 'var(--step-bg)',
                    borderRadius: 6,
                    fontSize: 14,
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--secondary)',
                      minWidth: 24,
                    }}
                  >
                    {step.order}.
                  </span>
                  <span>{step.description}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {notes && (
        <div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#333',
              marginBottom: 12,
            }}
          >
            备注
          </h3>
          <div
            style={{
              padding: 12,
              backgroundColor: 'var(--step-bg)',
              borderRadius: 6,
              fontSize: 14,
              whiteSpace: 'pre-wrap',
            }}
          >
            {notes}
          </div>
        </div>
      )}
    </div>
  );
}
