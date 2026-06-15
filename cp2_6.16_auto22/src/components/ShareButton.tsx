import React, { useState } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import jsPDF from 'jspdf';
import './ShareButton.css';

const ShareButton: React.FC = () => {
  const { itinerary } = useItinerary();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportPDF = () => {
    if (!itinerary) return;

    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setTextColor(0, 137, 123);
    doc.text('旅行行程单', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`总预算: ¥${itinerary.budget.toFixed(2)}`, 20, y);
    doc.text(`总花费: ¥${itinerary.totalCost.toFixed(2)}`, 20, y + 8);
    doc.text(`旅行天数: ${itinerary.days}天`, 20, y + 16);
    doc.text(`偏好: ${itinerary.preference === 'budget' ? '省钱' : itinerary.preference === 'luxury' ? '奢华' : '均衡'}`, 20, y + 24);
    y += 40;

    itinerary.itineraries.forEach((day) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 137, 123);
      doc.text(`${day.date}`, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(255, 111, 0);
      doc.text(`当日花费: ¥${day.actualCost.toFixed(2)}`, 20, y);
      y += 10;

      doc.setTextColor(50);
      day.activities.forEach((activity) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(9);
        doc.text(`  ${activity.time} | ${activity.name}`, 25, y);
        y += 6;
        doc.setTextColor(100);
        doc.text(`    ${activity.location} - ¥${activity.cost.toFixed(2)}`, 25, y);
        doc.setTextColor(50);
        y += 6;
      });

      y += 10;
    });

    doc.save('旅行行程单.pdf');
    setIsOpen(false);
  };

  const handleShareLink = async () => {
    if (!itinerary) return;

    const shareUrl = `${window.location.origin}?id=${itinerary.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('分享链接: ' + shareUrl);
    }
  };

  if (!itinerary) return null;

  return (
    <div className="share-button-container">
      <button
        className={`share-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="分享"
      >
        <span className="fab-icon">{isOpen ? '×' : '↗'}</span>
      </button>

      {isOpen && (
        <div className="share-panel">
          <div className="share-panel-header">
            <h4>分享行程</h4>
          </div>
          <div className="share-options">
            <button className="share-option" onClick={handleExportPDF}>
              <span className="share-icon">📄</span>
              <span className="share-text">导出PDF</span>
            </button>
            <button className="share-option" onClick={handleShareLink}>
              <span className="share-icon">🔗</span>
              <span className="share-text">
                {copied ? '已复制!' : '生成分享链接'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareButton;
