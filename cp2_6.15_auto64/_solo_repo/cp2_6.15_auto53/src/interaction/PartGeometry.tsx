import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Part, MATERIAL_COLORS, MaterialType } from '../store/partsStore';

interface PartGeometryProps {
  part: Part;
  selected: boolean;
  opacity?: number;
}

function createWoodMaterial(color: string, opacity: number = 1, transparent: boolean = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0.05,
    transparent,
    opacity,
    side: THREE.DoubleSide,
  });
}

function TenonGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const tenonW = width * 0.6;
  const tenonD = depth * 0.5;
  const baseD = depth - tenonD;

  const baseGeo = new THREE.BoxGeometry(width, height, baseD);
  const tenonGeo = new THREE.BoxGeometry(tenonW, height * 0.85, tenonD);

  const baseMat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  return (
    <group>
      <mesh position={[0, 0, -tenonD / 2]} geometry={baseGeo} material={baseMat} castShadow receiveShadow />
      <mesh position={[0, 0, baseD / 2]} geometry={tenonGeo} material={baseMat} castShadow receiveShadow />
    </group>
  );
}

function MortiseGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const mortiseW = width * 0.64;
  const mortiseH = height * 0.88;
  const mortiseD = depth * 0.52;

  const outerShape = new THREE.Shape();
  outerShape.moveTo(-width / 2, -height / 2);
  outerShape.lineTo(width / 2, -height / 2);
  outerShape.lineTo(width / 2, height / 2);
  outerShape.lineTo(-width / 2, height / 2);
  outerShape.lineTo(-width / 2, -height / 2);

  const holePath = new THREE.Path();
  holePath.moveTo(-mortiseW / 2, -mortiseH / 2);
  holePath.lineTo(mortiseW / 2, -mortiseH / 2);
  holePath.lineTo(mortiseW / 2, mortiseH / 2);
  holePath.lineTo(-mortiseW / 2, mortiseH / 2);
  holePath.lineTo(-mortiseW / 2, -mortiseH / 2);
  outerShape.holes.push(holePath);

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  geometry.center();
  const mat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  return <mesh geometry={geometry} material={mat} castShadow receiveShadow />;
}

function DovetailTenonGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const baseD = depth * 0.45;
  const tailD = depth * 0.55;
  const tailTopW = width * 0.72;
  const tailBottomW = width * 0.52;

  const baseGeo = new THREE.BoxGeometry(width, height, baseD);
  const mat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(-tailBottomW / 2, -height / 2);
  tailShape.lineTo(tailBottomW / 2, -height / 2);
  tailShape.lineTo(tailTopW / 2, height / 2);
  tailShape.lineTo(-tailTopW / 2, height / 2);
  tailShape.lineTo(-tailBottomW / 2, -height / 2);

  const tailExtrude = {
    steps: 1,
    depth: tailD,
    bevelEnabled: false,
  };

  const tailGeo = new THREE.ExtrudeGeometry(tailShape, tailExtrude);
  tailGeo.translate(0, 0, 0);
  tailGeo.center();

  return (
    <group>
      <mesh position={[0, 0, -tailD / 2]} geometry={baseGeo} material={mat} castShadow receiveShadow />
      <mesh position={[0, 0, baseD / 2]} geometry={tailGeo} material={mat} castShadow receiveShadow />
    </group>
  );
}

function DovetailMortiseGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const slotTopW = width * 0.76;
  const slotBottomW = width * 0.56;
  const slotH = height * 0.9;

  const outerShape = new THREE.Shape();
  outerShape.moveTo(-width / 2, -height / 2);
  outerShape.lineTo(width / 2, -height / 2);
  outerShape.lineTo(width / 2, height / 2);
  outerShape.lineTo(-width / 2, height / 2);
  outerShape.lineTo(-width / 2, -height / 2);

  const hole = new THREE.Path();
  hole.moveTo(-slotBottomW / 2, -slotH / 2);
  hole.lineTo(slotBottomW / 2, -slotH / 2);
  hole.lineTo(slotTopW / 2, slotH / 2);
  hole.lineTo(-slotTopW / 2, slotH / 2);
  hole.lineTo(-slotBottomW / 2, -slotH / 2);
  outerShape.holes.push(hole);

  const extrudeSettings = { steps: 1, depth, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
  geometry.center();
  const mat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  return <mesh geometry={geometry} material={mat} castShadow receiveShadow />;
}

function LTenonGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const armW = width * 0.55;
  const armD = depth * 0.55;
  const baseArmW = width * 0.95;
  const baseArmD = depth * 0.95;
  const mat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  const baseXGeo = new THREE.BoxGeometry(baseArmW, height, width * 0.45);
  const baseZGeo = new THREE.BoxGeometry(width * 0.45, height, baseArmD);

  const tenonXGeo = new THREE.BoxGeometry(armW * 0.55, height * 0.85, armD * 0.5);
  const tenonZGeo = new THREE.BoxGeometry(armW * 0.5, height * 0.85, armD * 0.55);

  return (
    <group>
      <mesh position={[0, 0, -depth * 0.275]} geometry={baseXGeo} material={mat} castShadow receiveShadow />
      <mesh position={[-width * 0.275, 0, 0]} geometry={baseZGeo} material={mat} castShadow receiveShadow />
      <mesh position={[0, 0, depth * 0.45]} geometry={tenonZGeo} material={mat} castShadow receiveShadow />
      <mesh position={[width * 0.45, 0, 0]} geometry={tenonXGeo} material={mat} castShadow receiveShadow />
    </group>
  );
}

function LMortiseGeometry({ dimensions }: { dimensions: { width: number; height: number; depth: number } }) {
  const { width, height, depth } = dimensions;
  const mat = useMemo(() => createWoodMaterial(MATERIAL_COLORS.oak), []);

  const thickness = width * 0.45;
  const slotW = width * 0.31;
  const slotD = depth * 0.31;

  const block1Geo = new THREE.BoxGeometry(width, height, thickness);
  const block2Geo = new THREE.BoxGeometry(thickness, height, depth - thickness);

  return (
    <group>
      <mesh position={[0, 0, -depth / 2 + thickness / 2]} geometry={block1Geo} material={mat} castShadow receiveShadow />
      <mesh position={[width / 2 - thickness / 2, 0, thickness / 2]} geometry={block2Geo} material={mat} castShadow receiveShadow />
    </group>
  );
}

export function PartMesh({ part, selected, opacity = 1 }: PartGeometryProps) {
  const materialColor = MATERIAL_COLORS[part.material];
  const transparent = opacity < 1;

  const renderGeometry = () => {
    switch (part.type) {
      case 'tenon':
        return <TenonGeometry dimensions={part.dimensions} />;
      case 'mortise':
        return <MortiseGeometry dimensions={part.dimensions} />;
      case 'dovetail_tenon':
        return <DovetailTenonGeometry dimensions={part.dimensions} />;
      case 'dovetail_mortise':
        return <DovetailMortiseGeometry dimensions={part.dimensions} />;
      case 'l_tenon':
        return <LTenonGeometry dimensions={part.dimensions} />;
      case 'l_mortise':
        return <LMortiseGeometry dimensions={part.dimensions} />;
      default:
        return <TenonGeometry dimensions={part.dimensions} />;
    }
  };

  const selectedColor = selected ? '#ffcc33' : materialColor;
  const emissiveColor = selected ? '#332200' : '#000000';

  return (
    <group>
      {renderGeometry()}
      {selected && (
        <mesh position={[0, -part.dimensions.height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(part.dimensions.width, part.dimensions.depth) * 0.55, Math.max(part.dimensions.width, part.dimensions.depth) * 0.62, 32]} />
          <meshBasicMaterial color="#ffcc33" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export { createWoodMaterial };
