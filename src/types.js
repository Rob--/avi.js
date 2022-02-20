import Struct from 'structron';

const Buffer = (length) => ({
  read(buffer, offset) {
    return buffer.slice(offset, offset + length);
  },
  write(value, context, offset) {
    value.copy(context.buffer, offset);
  },
  SIZE: length,
});

function MainAVIHeader() {
  return new Struct()
    .addMember(Struct.TYPES.UINT_LE, 'MicroSecPerFrame')
    .addMember(Struct.TYPES.UINT_LE, 'MaxBytesPerSec')
    .addMember(Struct.TYPES.UINT_LE, 'PaddingGranularity')
    .addMember(Struct.TYPES.UINT_LE, 'Flags')
    .addMember(Struct.TYPES.UINT_LE, 'TotalFrames')
    .addMember(Struct.TYPES.UINT_LE, 'InitialFrames')
    .addMember(Struct.TYPES.UINT_LE, 'Streams')
    .addMember(Struct.TYPES.UINT_LE, 'SuggestedBufferSize')
    .addMember(Struct.TYPES.UINT_LE, 'Width')
    .addMember(Struct.TYPES.UINT_LE, 'Height')
    .addMember(Struct.TYPES.SKIP(4 * 4), 'Reserved');
}

function AVIStreamHeader() {
  const Rect = new Struct()
      .addMember(Struct.TYPES.SHORT_LE, 'left')
      .addMember(Struct.TYPES.SHORT_LE, 'top')
      .addMember(Struct.TYPES.SHORT_LE, 'right')
      .addMember(Struct.TYPES.SHORT_LE, 'bottom');

    return new Struct()
      .addMember(Struct.TYPES.STRING(4), 'fccType')
      .addMember(Struct.TYPES.STRING(4), 'fccHandler')
      .addMember(Struct.TYPES.UINT_LE, 'Flags')
      .addMember(Struct.TYPES.SHORT_LE, 'Priority')
      .addMember(Struct.TYPES.SHORT_LE, 'Language')
      .addMember(Struct.TYPES.UINT_LE, 'InitialFrames')
      .addMember(Struct.TYPES.UINT_LE, 'Scale')
      .addMember(Struct.TYPES.UINT_LE, 'Rate')
      .addMember(Struct.TYPES.UINT_LE, 'Start')
      .addMember(Struct.TYPES.UINT_LE, 'Length')
      .addMember(Struct.TYPES.UINT_LE, 'SuggestedBufferSize')
      .addMember(Struct.TYPES.UINT_LE, 'Quality')
      .addMember(Struct.TYPES.UINT_LE, 'SampleSize')
      .addMember(Rect, 'rcFrame');
}

function VideoPropHeader(FieldPerFrame) {
  const VideoFieldDesc = new Struct()
      .addMember(Struct.TYPES.UINT_LE, 'CompressedBMHeight')
      .addMember(Struct.TYPES.UINT_LE, 'CompressedBMWidth')
      .addMember(Struct.TYPES.UINT_LE, 'ValidBMHeight')
      .addMember(Struct.TYPES.UINT_LE, 'ValidBMWidth')
      .addMember(Struct.TYPES.UINT_LE, 'ValidBMXOffset')
      .addMember(Struct.TYPES.UINT_LE, 'ValidBMYOffset')
      .addMember(Struct.TYPES.UINT_LE, 'VideoXOffsetInT')
      .addMember(Struct.TYPES.UINT_LE, 'VideoYValidStartLine');

    // offset of FieldInfo[] in VideoPropHeader
    // const FIELD_INFO_OFFSET = 36;
    
    const struct = new Struct()
      .addMember(Struct.TYPES.UINT_LE, 'VideoFormatToken')
      .addMember(Struct.TYPES.UINT_LE, 'VideoStandard')
      .addMember(Struct.TYPES.UINT_LE, 'VerticalRefreshRate')
      .addMember(Struct.TYPES.UINT_LE, 'HTotalInT')
      .addMember(Struct.TYPES.UINT_LE, 'VTotalInLines')
      .addMember(Struct.TYPES.UINT_LE, 'FrameAspectRatio')
      .addMember(Struct.TYPES.UINT_LE, 'FrameWidthInPixels')
      .addMember(Struct.TYPES.UINT_LE, 'FrameHeightInLines')
      .addMember(Struct.TYPES.UINT_LE, 'FieldPerFrame');

    // should add as array, but there is a bug in Structron...
    // .addArray(VideoFieldDesc, 'FieldInfo', FIELD_INFO_OFFSET, 'FieldPerFrame', true);
    for (let i = 0; i < FieldPerFrame; i++) {
      struct.addMember(VideoFieldDesc, `FieldInfo${i}`);
    }

    return struct;
}

function AVIINDEXENTRY() {
  return new Struct()
      .addMember(Struct.TYPES.STRING(4), 'ckID')
      .addMember(Struct.TYPES.UINT_LE, 'Flags')
      .addMember(Struct.TYPES.UINT_LE, 'ChunkOffset')
      .addMember(Struct.TYPES.UINT_LE, 'ChunkLength');
}

function BITMAPINFOHEADER() {
  return new Struct()
    .addMember(Struct.TYPES.UINT_LE, 'Size')
    .addMember(Struct.TYPES.INT_LE, 'Width')
    .addMember(Struct.TYPES.INT_LE, 'Height')
    .addMember(Struct.TYPES.SHORT_LE, 'Planes')
    .addMember(Struct.TYPES.SHORT_LE, 'BitCount')
    .addMember(Struct.TYPES.STRING(4), 'Compression')
    .addMember(Struct.TYPES.UINT_LE, 'SizeImage')
    .addMember(Struct.TYPES.INT_LE, 'XPelsPerMeter')
    .addMember(Struct.TYPES.INT_LE, 'YPelsPerMeter')
    .addMember(Struct.TYPES.UINT_LE, 'ClrUsed')
    .addMember(Struct.TYPES.UINT_LE, 'ClrImportant');
}

function WAVEFORMATEX() {
  return new Struct()
    .addMember(Struct.TYPES.SHORT_LE, 'FormatTag')
    .addMember(Struct.TYPES.SHORT_LE, 'Channels')
    .addMember(Struct.TYPES.UINT_LE, 'SamplesPerSec')
    .addMember(Struct.TYPES.UINT_LE, 'AvgBytesPerSec')
    .addMember(Struct.TYPES.SHORT_LE, 'BlockAlign')
    .addMember(Struct.TYPES.SHORT_LE, 'BitsPerSample')
    .addMember(Struct.TYPES.SHORT_LE, 'Size');
}

function WAVEFORMATEXTENSIBLE() {
  const GUID = new Struct()
    .addMember(Struct.TYPES.UINT_LE, 'Data1')
    .addMember(Struct.TYPES.USHORT_LE, 'Data2')
    .addMember(Struct.TYPES.USHORT_LE, 'Data3')
    .addArray(Struct.TYPES.CHAR, 'Data4', 8, 8);

  return new Struct()
    .addMember(WAVEFORMATEX(), 'Format')
    .addMember(Struct.TYPES.SHORT_LE, 'Samples')
    .addMember(Struct.TYPES.UINT_LE, 'ChannelMask')
    .addMember(GUID, 'SubFormat');
}

function MPEG1WAVEFORMAT() {
  return new Struct()
    .addMember(WAVEFORMATEX(), 'wfx')
    .addMember(Struct.TYPES.SHORT_LE, 'HeadLayer')
    .addMember(Struct.TYPES.UINT_LE, 'HeadBitrate')
    .addMember(Struct.TYPES.SHORT_LE, 'HeadMode')
    .addMember(Struct.TYPES.SHORT_LE, 'HeadModeExt')
    .addMember(Struct.TYPES.SHORT_LE, 'HeadEmphasis')
    .addMember(Struct.TYPES.SHORT_LE, 'HeadFlags')
    .addMember(Struct.TYPES.UINT_LE, 'PTSLow')
    .addMember(Struct.TYPES.UINT_LE, 'PTSHigh');
}

function MPEGLAYER3WAVEFORMAT() {
  return new Struct()
    .addMember(WAVEFORMATEX(), 'wfx')
    .addMember(Struct.TYPES.SHORT_LE, 'ID')
    .addMember(Struct.TYPES.UINT_LE, 'Flags')
    .addMember(Struct.TYPES.SHORT_LE, 'BlockSize')
    .addMember(Struct.TYPES.SHORT_LE, 'FramesPerBlock')
    .addMember(Struct.TYPES.SHORT_LE, 'CodecDelay');
}

export default {
  MainAVIHeader: MainAVIHeader(),
  AVIStreamHeader: AVIStreamHeader(),
  VideoPropHeader: VideoPropHeader,
  AVIINDEXENTRY: AVIINDEXENTRY(),
  BITMAPINFOHEADER: BITMAPINFOHEADER(),
  WAVEFORMATEX: WAVEFORMATEX(),
  WAVEFORMATEXTENSIBLE: WAVEFORMATEXTENSIBLE(),
  MPEG1WAVEFORMAT: MPEG1WAVEFORMAT(),
  MPEGLAYER3WAVEFORMAT: MPEGLAYER3WAVEFORMAT(),
  Buffer,
};
