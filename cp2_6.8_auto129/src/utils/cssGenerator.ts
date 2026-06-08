import type { Block, LayoutConfig } from '../types';

export const generateContainerCSS = (config: LayoutConfig): string => {
  const lines: string[] = ['.canvas-container {'];

  lines.push(`  display: ${config.display};`);
  lines.push(`  position: ${config.position};`);

  if (config.display === 'flex') {
    if (config.flexDirection) lines.push(`  flex-direction: ${config.flexDirection};`);
    if (config.justifyContent) lines.push(`  justify-content: ${config.justifyContent};`);
    if (config.alignItems) lines.push(`  align-items: ${config.alignItems};`);
    lines.push(`  gap: 20px;`);
  }

  if (config.display === 'grid') {
    if (config.gridTemplateColumns)
      lines.push(`  grid-template-columns: ${config.gridTemplateColumns};`);
    if (config.gridTemplateRows)
      lines.push(`  grid-template-rows: ${config.gridTemplateRows};`);
    lines.push(`  gap: 20px;`);
  }

  lines.push('}');
  return lines.join('\n');
};

export const generateBlocksCSS = (blocks: Block[]): string => {
  return blocks
    .map((block, index) => {
      const lines: string[] = [`.block-${index + 1} {`];
      lines.push(`  width: ${block.width}px;`);
      lines.push(`  height: ${block.height}px;`);
      lines.push(`  background-color: ${block.backgroundColor};`);
      lines.push(`  border-radius: 8px;`);
      if (block.x !== 0 || block.y !== 0) {
        lines.push(`  position: absolute;`);
        lines.push(`  left: ${block.x}px;`);
        lines.push(`  top: ${block.y}px;`);
      }
      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');
};

export const generateFullCSS = (config: LayoutConfig, blocks: Block[]): string => {
  return `${generateContainerCSS(config)}\n\n${generateBlocksCSS(blocks)}`;
};
