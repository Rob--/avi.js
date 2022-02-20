class Frames {
  constructor(frames) {
    this.frames = frames.map((frame, index) => ({
      ...frame,
      _id: `${index}_${frame.id}_${frame.size}`,
    }));

    this.inject();
  }

  getFrames() {
    return this.frames;
  }

  getKeyframes() {
    return this.frames.filter(({ flags, id }) => flags.AVIIF_KEYFRAME && id.endsWith('dc'));
  }

  getIndexEntries() {
    let chunkOffset = 4
    return this.frames.reduce((entries, frame, index) => {
      entries[`indexEntry${index}`] = {
        ckID: frame.id,
        Flags: this.collapseFlags(frame.flags),
        ChunkOffset: chunkOffset,
        ChunkLength: frame.data.length,
      };

      chunkOffset += 8 + this.pad(frame.data.length);

      return entries;
    }, {});
  }

  pad(number) {
    return Math.ceil(number / 2) * 2;
  }

  getDataEntries() {
    let size = 0;
    const data = this.frames.reduce((entries, frame, index) => {
      const key = `chnk${index}`;

      entries[key] = {
        ckID: frame.id,
        ckSize: frame.data.length,
        ckData: frame.data,
      };

      const padding = this.pad(frame.data.length) - frame.data.length;
      if (padding > 0) {
        entries[key].padding = padding;
      }

      size += 8 + frame.data.length + padding;

      return entries;
    }, {});

    return { size, data };
  }

  collapseFlags(flags) {
    const _FLAGS = {
      AVIIF_LIST:       0x00000001,
      AVIIF_TWOCC:      0x00000002,
      AVIIF_KEYFRAME:   0x00000010,
      AVIIF_FIRSTPART:  0x00000020,
      AVIIF_LASTPART:   0x00000040,
      AVIIF_MIDPART:    0x00000060,
      AVIIF_NOTIME:     0x00000100,
      AVIIF_COMPUSE:    0x0FFF0000,
    };

    return Object.entries(flags).reduce((value, [flag, active]) => {
      return value + (_FLAGS[flag] * active);
    }, 0);
  }

  inject() {
    this.frames = this.frames.map(frame => ({
      ...frame,
      delete: () => this.delete(frame),
      duplicate: () => this.duplicate(frame),
    }));
  }

  delete(frame) {
    this.frames = this.frames.filter(f => !this.equals(f, frame));
  }

  duplicate(frame) {
    const index = this.frames.findIndex(f => this.equals(f, frame));
    const before = this.frames.slice(0, index);
    const after = this.frames.slice(index);

    this.frames = [...before, frame, ...after];
  }

  equals(frame1, frame2) {
    if (frame1._id !== frame2._id) {
      return false;
    }

    if (frame1.id !== frame2.id) {
      return false;
    }

    if (frame1.size !== frame2.size) {
      return false;
    }

    if (!frame1.data.equals(frame2.data)) {
      return false;
    }
    
    if (JSON.stringify(frame1.flags) !== JSON.stringify(frame2.flags)) {
      return false;
    }

    return true;
  }
}

export default Frames;
