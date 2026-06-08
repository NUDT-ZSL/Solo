import type { Board as BoardType } from '../Types';
import ListColumn from './ListColumn';

interface Props {
  board: BoardType;
  onAddCard: (listId: string, title: string, content: string) => void;
  onMoveCard: (cardId: string, fromListId: string, toListId: string, toIndex: number) => void;
}

export default function BoardView({ board, onAddCard, onMoveCard }: Props) {
  return (
    <div className="board-container">
      <div className="board">
        {board.lists.map((list) => (
          <ListColumn
            key={list.id}
            list={list}
            onAddCard={onAddCard}
            onMoveCard={onMoveCard}
          />
        ))}
      </div>
    </div>
  );
}
