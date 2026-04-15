import TarotCard from './TarotCard';

export default function TarotGrid({ cardPool, selectedCards = [], onCardSelect, maxSelections = 3, isLocked = false }) {
  const pool = Array.isArray(cardPool) ? cardPool : [];

  const handleCardClick = (cardId) => {
    if (isLocked) return;

    const alreadySelected = selectedCards.includes(cardId);

    if (alreadySelected) {
      // 取消选择
      onCardSelect(selectedCards.filter((id) => id !== cardId));
    } else if (selectedCards.length < maxSelections) {
      // 选中新卡
      onCardSelect([...selectedCards, cardId]);
    }
    // 已达上限且未选中 → 不处理
  };

  return (
    <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
      {pool.map((card) => {
        const isSelected = selectedCards.includes(card.id);
        const isCardLocked =
          isLocked || (!isSelected && selectedCards.length >= maxSelections);

        return (
          <TarotCard
            key={card.id}
            cardId={card.id}
            title={card.title}
            subtitle={card.subtitle}
            tags={card.tags}
            isSelected={isSelected}
            isLocked={isCardLocked}
            onClick={handleCardClick}
          />
        );
      })}
    </div>
  );
}
