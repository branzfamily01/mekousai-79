(() => {
  const root = document.getElementById('bgm-player');
  const audio = root?.querySelector('audio');
  if (!root || !audio) return;

  const tracks = [
    { title: 'Summer Sketchbook', src: 'Summer Sketchbook.mp3' },
    { title: 'Festival Rush', src: 'Festival Rush(1).mp3' },
    { title: 'After the Lights', src: 'After the Lights(1).mp3' },
    { title: 'One Brilliant Moment', src: 'One Brilliant Moment(1).mp3' },
    { title: 'First Spark', src: 'First Spark(1).mp3' },
    { title: 'After School Glow', src: 'After School Glow(1).mp3' }
  ];

  const title = root.querySelector('.cassette-label strong');
  const meta = root.querySelector('.cassette-label small');
  let index = 0;
  let consecutiveErrors = 0;

  audio.removeAttribute('loop');

  const showTrack = () => {
    const track = tracks[index];
    if (title) title.textContent = track.title;
    if (meta) meta.textContent = `${index + 1} / ${tracks.length} • instrumental`;
  };

  const setTrack = (nextIndex, autoplay = false) => {
    index = (nextIndex + tracks.length) % tracks.length;
    const track = tracks[index];
    audio.src = track.src;
    audio.load();
    showTrack();
    if (autoplay) audio.play().catch(() => {});
  };

  audio.addEventListener('loadeddata', () => { consecutiveErrors = 0; });
  audio.addEventListener('ended', () => {
    consecutiveErrors = 0;
    setTrack(index + 1, true);
  });
  audio.addEventListener('error', () => {
    consecutiveErrors += 1;
    if (consecutiveErrors >= tracks.length) return;
    setTrack(index + 1, true);
  });

  setTrack(0, false);
})();
