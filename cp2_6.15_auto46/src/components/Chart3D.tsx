import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMeteoStore } from '@/store/useMeteoStore';
import { CITIES, METRIC_CONFIG, getMetricColor, type CityName, type WeatherData } from '@/data/mockData';

interface BarData {
  city: CityName;
  dayIndex: number;
  value: number;
  data: WeatherData;
  x: number;
  z: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function Chart3D() {
  const groupRef = useRef<THREE.Group>(null);
  const barMeshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const sphereMeshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const { camera, size } = useThree();
  const [hoveredSphere, setHoveredSphere] = useState<string | null>(null);

  const {
    data,
    selectedMetric,
    currentDay,
    compareMode,
    selectedCity,
    compareCity,
    showPopup,
    opacity,
  } = useMeteoStore();

  const animationRef = useRef({
    progress: 1,
    startHeights: new Map<string, number>(),
    targetHeights: new Map<string, number>(),
    prevDay: -1,
    prevMetric: '' as string,
    prevCitiesKey: '',
    isFirstRender: true,
  });

  const cities = useMemo(() => {
    if (compareMode) {
      return [selectedCity, compareCity];
    }
    return [selectedCity];
  }, [compareMode, selectedCity, compareCity]);

  const citiesKey = useMemo(() => cities.join(','), [cities]);

  const maxValue = useMemo(() => {
    let max = 0;
    cities.forEach((city) => {
      const cityData = data[city];
      if (cityData) {
        cityData.forEach((d) => {
          if (d[selectedMetric] > max) {
            max = d[selectedMetric];
          }
        });
      }
    });
    return max || 1;
  }, [data, selectedMetric, cities]);

  const barsData = useMemo(() => {
    const result: BarData[] = [];
    const citySpacing = 1.5;
    const barWidth = 0.8;

    const groupWidth = 7 * barWidth + 6 * 0.1;
    const totalGroupsWidth = cities.length * groupWidth + (cities.length - 1) * citySpacing;
    const startX = -totalGroupsWidth / 2;

    cities.forEach((city, cityIndex) => {
      const cityData = data[city];
      if (!cityData) return;

      const groupStartX = startX + cityIndex * (groupWidth + citySpacing);

      cityData.forEach((dayData, dayIndex) => {
        const x = groupStartX + dayIndex * (barWidth + 0.1) + barWidth / 2;
        const z = 0;
        const value = dayData[selectedMetric];

        result.push({
          city,
          dayIndex,
          value,
          data: dayData,
          x,
          z,
        });
      });
    });

    return result;
  }, [data, selectedMetric, cities]);

  const getTargetHeight = (bar: BarData) => {
    if (bar.dayIndex > currentDay) {
      return 0;
    }
    return (bar.value / maxValue) * 5;
  };

  useEffect(() => {
    const anim = animationRef.current;

    const dayChanged = anim.prevDay !== currentDay;
    const metricChanged = anim.prevMetric !== selectedMetric;
    const citiesChanged = anim.prevCitiesKey !== citiesKey;

    if (anim.isFirstRender) {
      barsData.forEach((bar) => {
        const key = `${bar.city}-${bar.dayIndex}`;
        const targetH = getTargetHeight(bar);
        anim.startHeights.set(key, targetH);
        anim.targetHeights.set(key, targetH);

        const barMesh = barMeshRefs.current.get(key);
        const sphereMesh = sphereMeshRefs.current.get(key);
        if (barMesh) {
          barMesh.scale.y = Math.max(0.001, targetH);
          barMesh.position.y = targetH / 2;
        }
        if (sphereMesh) {
          sphereMesh.position.y = targetH + 0.2;
          sphereMesh.visible = targetH > 0.1;
        }
      });
      anim.isFirstRender = false;
      anim.progress = 1;
    } else if (dayChanged || metricChanged || citiesChanged) {
      anim.progress = 0;
      anim.startHeights.clear();
      anim.targetHeights.clear();

      barsData.forEach((bar) => {
        const key = `${bar.city}-${bar.dayIndex}`;
        const barMesh = barMeshRefs.current.get(key);
        const currentH = barMesh ? barMesh.scale.y : 0;
        const targetH = getTargetHeight(bar);

        anim.startHeights.set(key, currentH);
        anim.targetHeights.set(key, targetH);
      });
    }

    anim.prevDay = currentDay;
    anim.prevMetric = selectedMetric;
    anim.prevCitiesKey = citiesKey;
  }, [currentDay, selectedMetric, citiesKey, barsData, maxValue]);

  useFrame((_, delta) => {
    const anim = animationRef.current;

    if (anim.progress < 1) {
      anim.progress = Math.min(anim.progress + delta / 0.3, 1);
      const t = easeOutCubic(anim.progress);

      barsData.forEach((bar) => {
        const key = `${bar.city}-${bar.dayIndex}`;
        const startH = anim.startHeights.get(key) || 0;
        const targetH = anim.targetHeights.get(key) || 0;
        const currentH = startH + (targetH - startH) * t;

        const barMesh = barMeshRefs.current.get(key);
        const sphereMesh = sphereMeshRefs.current.get(key);

        if (barMesh) {
          barMesh.scale.y = Math.max(0.001, currentH);
          barMesh.position.y = currentH / 2;
        }
        if (sphereMesh) {
          sphereMesh.position.y = currentH + 0.2;
          sphereMesh.visible = currentH > 0.1;
        }
      });
    }
  });

  const handleSphereClick = (bar: BarData, event: any) => {
    event.stopPropagation();
    const vector = new THREE.Vector3();
    const mesh = sphereMeshRefs.current.get(`${bar.city}-${bar.dayIndex}`);
    if (mesh) {
      mesh.getWorldPosition(vector);
      vector.project(camera);

      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-vector.y * 0.5 + 0.5) * size.height;

      showPopup(bar.data, { x, y }, bar.city);
    }
  };

  const handleSpherePointerOver = (key: string) => {
    setHoveredSphere(key);
    document.body.style.cursor = 'pointer';
  };

  const handleSpherePointerOut = () => {
    setHoveredSphere(null);
    document.body.style.cursor = 'auto';
  };

  const dividerPosition = useMemo(() => {
    if (!compareMode || cities.length < 2) return null;
    const groupWidth = 7 * 0.8 + 6 * 0.1;
    return -groupWidth / 2 - 0.75;
  }, [compareMode, cities.length]);

  const dashedLinePoints = useMemo(() => {
    if (!compareMode) return [];
    const points: [number, number, number][] = [];
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      points.push([0, i * 0.3, 0]);
    }
    return points;
  }, [compareMode]);

  return (
    <group ref={groupRef}>
      {barsData.map((bar) => {
        const key = `${bar.city}-${bar.dayIndex}`;
        const color = getMetricColor(selectedMetric, bar.value / maxValue);
        const isHovered = hoveredSphere === key;
        const sphereScale = isHovered ? 1.3 : 1;

        return (
          <group key={key} position={[bar.x, 0, bar.z]}>
            <mesh
              ref={(el) => {
                if (el) barMeshRefs.current.set(key, el);
              }}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.8, 1, 0.8]} />
              <meshStandardMaterial
                color={color}
                metalness={0.3}
                roughness={0.7}
                transparent
                opacity={opacity}
              />
            </mesh>

            <mesh
              ref={(el) => {
                if (el) sphereMeshRefs.current.set(key, el);
              }}
              scale={sphereScale}
              onClick={(e) => handleSphereClick(bar, e)}
              onPointerOver={() => handleSpherePointerOver(key)}
              onPointerOut={handleSpherePointerOut}
            >
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial
                color={color}
                transparent
                opacity={0.5}
                emissive={color}
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        );
      })}

      {compareMode && dividerPosition !== null && (
        <group position={[dividerPosition, 0, 0]}>
          {dashedLinePoints.map((point, i) => (
            <mesh
              key={i}
              position={[point[0], point[1] + 0.1, point[2]]}
            >
              <planeGeometry args={[0.02, 0.2]} />
              <meshBasicMaterial
                color="#4fc3f7"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
