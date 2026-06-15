import { ComponentType, ComponentNode, COMPONENT_TYPES } from './SegmentEngine';

function cloneNode(node: ComponentNode): ComponentNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  };
}

export namespace ComponentAdjuster {
  export function resizeComponent(
    node: ComponentNode,
    id: string,
    corner: 'nw' | 'ne' | 'sw' | 'se',
    dx: number,
    dy: number,
    minSize = 20
  ): ComponentNode {
    return updateComponentInTree(node, id, (target) => {
      let { x, y, width, height } = target;

      switch (corner) {
        case 'nw':
          const newWidthNw = width - dx;
          const newHeightNw = height - dy;
          if (newWidthNw >= minSize) {
            x = x + dx;
            width = newWidthNw;
          }
          if (newHeightNw >= minSize) {
            y = y + dy;
            height = newHeightNw;
          }
          break;
        case 'ne':
          const newWidthNe = width + dx;
          const newHeightNe = height - dy;
          if (newWidthNe >= minSize) {
            width = newWidthNe;
          }
          if (newHeightNe >= minSize) {
            y = y + dy;
            height = newHeightNe;
          }
          break;
        case 'sw':
          const newWidthSw = width - dx;
          const newHeightSw = height + dy;
          if (newWidthSw >= minSize) {
            x = x + dx;
            width = newWidthSw;
          }
          if (newHeightSw >= minSize) {
            height = newHeightSw;
          }
          break;
        case 'se':
          const newWidthSe = width + dx;
          const newHeightSe = height + dy;
          if (newWidthSe >= minSize) {
            width = newWidthSe;
          }
          if (newHeightSe >= minSize) {
            height = newHeightSe;
          }
          break;
      }

      return { ...target, x, y, width, height };
    });
  }

  export function reIdentifyComponent(node: ComponentNode, id: string): ComponentNode {
    return updateComponentInTree(node, id, (target) => {
      const currentIndex = COMPONENT_TYPES.indexOf(target.type);
      const nextIndex = (currentIndex + 1) % COMPONENT_TYPES.length;
      return { ...target, type: COMPONENT_TYPES[nextIndex] };
    });
  }

  export function changeComponentType(
    node: ComponentNode,
    id: string,
    newType: ComponentType
  ): ComponentNode {
    return updateComponentInTree(node, id, (target) => ({ ...target, type: newType }));
  }

  export function mergeWithPrevious(
    siblings: ComponentNode[],
    currentIndex: number
  ): ComponentNode[] {
    if (currentIndex <= 0 || currentIndex >= siblings.length) {
      return siblings;
    }

    const prev = siblings[currentIndex - 1];
    const curr = siblings[currentIndex];

    const newX = Math.min(prev.x, curr.x);
    const newY = Math.min(prev.y, curr.y);
    const newWidth = Math.max(prev.x + prev.width, curr.x + curr.width) - newX;
    const newHeight = Math.max(prev.y + prev.height, curr.y + curr.height) - newY;

    const merged: ComponentNode = {
      id: `${prev.id}-${curr.id}`,
      type: 'container',
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      children: [cloneNode(prev), cloneNode(curr)],
    };

    const result: ComponentNode[] = [];
    for (let i = 0; i < siblings.length; i++) {
      if (i === currentIndex - 1) {
        result.push(merged);
      } else if (i !== currentIndex) {
        result.push(cloneNode(siblings[i]));
      }
    }
    return result;
  }

  export function splitComponentVertically(
    node: ComponentNode,
    id: string
  ): ComponentNode {
    return updateComponentInTree(node, id, (target) => {
      const halfWidth = target.width / 2;
      const midX = target.x + halfWidth;

      const leftChildren: ComponentNode[] = [];
      const rightChildren: ComponentNode[] = [];

      for (const child of target.children) {
        const childCenterX = child.x + child.width / 2;
        if (childCenterX < midX) {
          leftChildren.push(cloneNode(child));
        } else {
          rightChildren.push(cloneNode(child));
        }
      }

      const leftNode: ComponentNode = {
        id: `${target.id}-left`,
        type: target.type,
        x: target.x,
        y: target.y,
        width: halfWidth,
        height: target.height,
        children: leftChildren,
        imageData: target.imageData,
      };

      const rightNode: ComponentNode = {
        id: `${target.id}-right`,
        type: target.type,
        x: target.x + halfWidth,
        y: target.y,
        width: halfWidth,
        height: target.height,
        children: rightChildren,
        imageData: target.imageData,
      };

      return {
        ...target,
        type: 'container',
        children: [leftNode, rightNode],
      };
    });
  }

  export function findComponentById(
    node: ComponentNode,
    id: string
  ): ComponentNode | null {
    if (node.id === id) {
      return node;
    }
    for (const child of node.children) {
      const found = findComponentById(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  export function updateComponentInTree(
    root: ComponentNode,
    id: string,
    updater: (n: ComponentNode) => ComponentNode
  ): ComponentNode {
    if (root.id === id) {
      return updater(root);
    }
    return {
      ...root,
      children: root.children.map((child) => updateComponentInTree(child, id, updater)),
    };
  }

  export function flattenComponents(node: ComponentNode): ComponentNode[] {
    const result: ComponentNode[] = [node];
    for (const child of node.children) {
      result.push(...flattenComponents(child));
    }
    return result;
  }
}

export default ComponentAdjuster;
