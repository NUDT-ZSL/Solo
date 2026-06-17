import { useMemo } from 'react';
import { useFontContext, getLuminance } from '../context/FontContext';

export default function PreviewPanel() {
  const ctx = useFontContext();

  const textColor = useMemo(() => {
    const lum = getLuminance(ctx.backgroundColor);
    return lum > 0.5 ? '#0F172A' : '#F8FAFC';
  }, [ctx.backgroundColor]);

  const previewStyle = useMemo(
    () => ({
      backgroundColor: ctx.backgroundColor,
      '--heading-font': ctx.headingFont,
      '--body-font': ctx.bodyFont,
      '--heading-weight': ctx.headingWeight,
      '--body-weight': ctx.bodyWeight,
      '--heading-size': `${ctx.headingSize}px`,
      '--body-size': `${ctx.bodySize}px`,
      '--line-height': ctx.lineHeight,
      '--heading-spacing': `${ctx.headingSpacing}px`,
      '--text-color': textColor,
    } as React.CSSProperties),
    [
      ctx.backgroundColor,
      ctx.headingFont,
      ctx.bodyFont,
      ctx.headingWeight,
      ctx.bodyWeight,
      ctx.headingSize,
      ctx.bodySize,
      ctx.lineHeight,
      ctx.headingSpacing,
      textColor,
    ]
  );

  return (
    <main className="preview-panel" style={previewStyle}>
      <div className="preview-content">
        <h1 className="preview-h1">字体排印的艺术</h1>
        <h2 className="preview-h2">The Art of Typography in Modern Design</h2>
        <p className="preview-p">
          字体排印是视觉传达的核心要素之一。好的字体搭配能够引导读者的视线，传达信息的层次与情感，
          让阅读成为一种愉悦的体验。在网页设计中，标题字体与正文字体的搭配尤为重要——
          标题需要醒目而有个性，正文则需要舒适耐读，两者之间需要保持和谐的视觉节奏。
          Typography is the art and technique of arranging type to make written language
          legible, readable, and appealing when displayed. The arrangement of type involves
          selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing.
        </p>
        <blockquote className="preview-blockquote">
          "字体不仅仅是文字的载体，更是情感与个性的表达。优秀的设计师懂得如何用字体讲故事。"
          <br />
          <span className="preview-cite">— Robert Bringhurst,《The Elements of Typographic Style》</span>
        </blockquote>
        <p className="preview-p">
          当我们选择字体组合时，需要考虑多方面的因素：字形的对比与协调、字重的层次感、
          行距与段落间距的呼吸感，以及在不同背景色下的可读性。这款工具正是为了帮助您
          直观地探索这些变量，找到最适合您项目的字体搭配方案。
        </p>
      </div>
    </main>
  );
}
