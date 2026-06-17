declare module 'wordcloud' {
  interface Options {
    list: Array<[string, number]>;
    gridSize?: number;
    weightFactor?: number | ((weight: number) => number);
    fontFamily?: string;
    color?: string | string[] | ((word: string, weight: number) => string);
    rotateRatio?: number;
    rotationSteps?: number;
    backgroundColor?: string;
    shuffle?: boolean;
    drawOutOfBound?: boolean;
    click?: (item: [string, number], dimension: any, event: MouseEvent) => void;
  }

  function WordCloud(canvas: HTMLCanvasElement, options: Options): void;
  export default WordCloud;
}
