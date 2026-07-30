const { secondsToSrtTime, secondsToVttTime, timeToSeconds } = require('./utils');

function formatOutput(result, format = 'json') {
  const segments = result.segments || result.subtitles || [];
  const fullText = result.text || segments.map((s) => s.text).join('\n') || '';

  const normalizedSegments = segments.map((seg, idx) => {
    const startSec = typeof seg.start === 'number' ? seg.start : timeToSeconds(seg.start);
    const endSec = typeof seg.end === 'number' ? seg.end : timeToSeconds(seg.end);
    return {
      index: idx + 1,
      start: startSec,
      end: endSec,
      speaker: seg.speaker || undefined,
      text: (seg.text || '').trim()
    };
  });

  switch (format.toLowerCase()) {
    case 'json':
      return JSON.stringify(
        {
          success: true,
          text: fullText,
          duration: result.duration || (normalizedSegments.length > 0 ? normalizedSegments[normalizedSegments.length - 1].end : 0),
          segments: normalizedSegments
        },
        null,
        2
      );

    case 'srt':
      return normalizedSegments
        .map((seg) => {
          const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : '';
          return `${seg.index}\n${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n${speakerPrefix}${seg.text}\n`;
        })
        .join('\n');

    case 'vtt':
      const vttLines = ['WEBVTT\n'];
      normalizedSegments.forEach((seg) => {
        const speakerPrefix = seg.speaker ? `<v ${seg.speaker}>` : '';
        vttLines.push(`${secondsToVttTime(seg.start)} --> ${secondsToVttTime(seg.end)}\n${speakerPrefix}${seg.text}\n`);
      });
      return vttLines.join('\n');

    case 'txt':
    default:
      return normalizedSegments
        .map((seg) => {
          const speakerPrefix = seg.speaker ? `[${seg.speaker}] ` : '';
          return `${speakerPrefix}${seg.text}`;
        })
        .join('\n');
  }
}

module.exports = {
  formatOutput
};
