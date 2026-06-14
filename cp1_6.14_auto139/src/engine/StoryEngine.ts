import { StoryNode, GameState, SceneData, Condition, Effect, Choice, GameEvent } from '../types';
import { eventBus } from './EventBus';

class StoryEngine {
  private nodes: Map<string, StoryNode> = new Map();
  private state: GameState = {
    currentNodeId: '',
    variables: {},
    visitedNodes: [],
    history: [],
  };
  private isLoaded: boolean = false;

  async loadStory(storyUrl: string = '/story.json'): Promise<void> {
    try {
      const response = await fetch(storyUrl);
      const storyData = await response.json();
      this.parseStory(storyData);
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load story:', error);
      throw error;
    }
  }

  private parseStory(storyData: { nodes: StoryNode[]; startNodeId: string }): void {
    this.nodes.clear();
    storyData.nodes.forEach((node) => {
      this.nodes.set(node.id, node);
    });
    this.state.currentNodeId = storyData.startNodeId;
  }

  startNewGame(): SceneData {
    if (!this.isLoaded) {
      throw new Error('Story not loaded');
    }
    const startNode = this.nodes.get(this.state.currentNodeId);
    if (!startNode) {
      throw new Error('Start node not found');
    }

    this.state = {
      currentNodeId: startNode.id,
      variables: {},
      visitedNodes: [startNode.id],
      history: [{ nodeId: startNode.id, timestamp: Date.now() }],
    };

    eventBus.emit(GameEvent.GAME_START, this.state);

    return this.getCurrentSceneData();
  }

  loadGame(savedState: GameState): SceneData {
    this.state = { ...savedState };
    this.isLoaded = true;
    eventBus.emit(GameEvent.LOAD_GAME, this.state);
    return this.getCurrentSceneData();
  }

  getCurrentSceneData(): SceneData {
    const node = this.nodes.get(this.state.currentNodeId);
    if (!node) {
      throw new Error(`Node ${this.state.currentNodeId} not found`);
    }

    const availableChoices = node.choices.map((choice) => ({
      ...choice,
      available: this.checkCondition(choice.condition),
    }));

    return {
      nodeId: node.id,
      text: node.text,
      background: node.background,
      ambientSound: node.ambientSound,
      choices: availableChoices as any,
      isEnding: node.isEnding,
      endingType: node.endingType,
      endingTitle: node.endingTitle,
    };
  }

  makeChoice(choiceId: string): SceneData | null {
    const currentNode = this.nodes.get(this.state.currentNodeId);
    if (!currentNode || currentNode.isEnding) {
      return null;
    }

    const choice = currentNode.choices.find((c) => c.id === choiceId);
    if (!choice) {
      console.warn(`Choice ${choiceId} not found in node ${this.state.currentNodeId}`);
      return null;
    }

    if (!this.checkCondition(choice.condition)) {
      console.warn(`Choice ${choiceId} condition not met`);
      return null;
    }

    if (choice.effects) {
      choice.effects.forEach((effect) => this.applyEffect(effect));
    }

    const nextNode = this.nodes.get(choice.nextNodeId);
    if (!nextNode) {
      console.warn(`Next node ${choice.nextNodeId} not found`);
      return null;
    }

    if (nextNode.effects) {
      nextNode.effects.forEach((effect) => this.applyEffect(effect));
    }

    this.state.currentNodeId = nextNode.id;
    if (!this.state.visitedNodes.includes(nextNode.id)) {
      this.state.visitedNodes.push(nextNode.id);
    }
    this.state.history.push({
      nodeId: nextNode.id,
      choiceId,
      timestamp: Date.now(),
    });

    const sceneData = this.getCurrentSceneData();
    eventBus.emit(GameEvent.SCENE_CHANGE, sceneData);
    eventBus.emit(GameEvent.SAVE_GAME, this.state);

    if (nextNode.isEnding) {
      eventBus.emit(GameEvent.GAME_END, { endingType: nextNode.endingType, state: this.state });
    }

    return sceneData;
  }

  private checkCondition(condition?: Condition): boolean {
    if (!condition) return true;

    const value = this.state.variables[condition.variable];

    switch (condition.operator) {
      case '==':
        return value == condition.value;
      case '!=':
        return value != condition.value;
      case '>=':
        return (value as number) >= (condition.value as number);
      case '<=':
        return (value as number) <= (condition.value as number);
      case '>':
        return (value as number) > (condition.value as number);
      case '<':
        return (value as number) < (condition.value as number);
      default:
        return true;
    }
  }

  private applyEffect(effect: Effect): void {
    switch (effect.type) {
      case 'set':
        this.state.variables[effect.variable] = effect.value;
        break;
      case 'add':
        const currentAdd = this.state.variables[effect.variable] as number | undefined;
        this.state.variables[effect.variable] = (currentAdd || 0) + (effect.value as number);
        break;
      case 'subtract':
        const currentSub = this.state.variables[effect.variable] as number | undefined;
        this.state.variables[effect.variable] = (currentSub || 0) - (effect.value as number);
        break;
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  getVariable(name: string): number | string | boolean | undefined {
    return this.state.variables[name];
  }

  isStoryLoaded(): boolean {
    return this.isLoaded;
  }

  getStartNodeId(): string {
    return this.state.currentNodeId || 'start';
  }
}

export const storyEngine = new StoryEngine();
export default storyEngine;
