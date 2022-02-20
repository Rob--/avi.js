import fs from 'fs';
import EventEmitter from 'events';
import Struct from 'structron';
import Frames from './Frames.js';
import types from './types.js';
import { replaceMember } from './utils.js';

class AVIReader extends EventEmitter {
  constructor(file) {
    super()
    this.load(file);

    this.lastSeenStreamType = '';
    this.struct = this.getListStruct(this.file);
  }

  /**
   * Emits debug message.
   * @param {string} message 
   */
  debug(message) {
    this.emit('debug', message);
  }

  /**
   * Uses the frame data and frame index list embedded in the AVI file
   * to create a Frames object.
   * @param {Object} parsed the parsed video object of the AVI file 
   * @returns Frames
   */
  static getFrames(parsed) {
    const movi = Object.values(parsed.data.list3.data);
    const idx1 = Object.values(parsed.data.chnk4.ckData);

    // combine frame data with index entries
    const frames = idx1.map((entry, index) => {
      const frame = movi[index];

      const idMatch = frame.ckID === entry.ckID;
      const sizeMatch = frame.ckSize === entry.ChunkLength;

      if (!idMatch || !sizeMatch) {
        throw new Error('Frame mismatch to index!');
      }

      return {
        id: frame.ckID,
        size: frame.ckSize,
        data: frame.ckData,
        flags: this.getIndexFlags(entry.Flags),
      };
    });
    
    return new Frames(frames);
  }

  /**
   * Loads an AVI file into the reader via buffer or file path.
   * @param {void} file the file buffer or file path
   * @returns 
   */
  load(file) {
    if (file.constructor === Buffer) {
      this.file = file;
      return;
    }

    if (typeof file === 'string' && fs.existsSync(file)) {
      this.file = fs.readFileSync(file);
      return;
    }

    throw new Error('Expected file buffer or file path.');
  }

  /**
   * Rounds a number up to the nearest WORD boundary.
   * @param {object} struct struct to add padding to
   * @param {number} size number to pad
   * @returns number rounded up to nearest WORD boundary
   */
  addPadding(struct, size) {
    const padding = (Math.ceil(size / 2) * 2) - size;
    
    if (padding > 0) {
      struct.addMember(Struct.TYPES.SKIP(padding), 'padding');
    }

    return padding;
  }

  /**
   * Parses the AVI file via buffer or file path.
   * @returns object containing the parsed data
   */
  read() {
    this.ctx = this.struct.readContext(this.file);

    if (this.ctx.hasErrors()) {
      console.log(this.ctx.errors);
      throw new Error('Parser unable to read AVI format.');
    }

    return this.ctx.data;
  }

  /**
   * Creates a new AVI file from AVI data.
   * @param {string} path path of new AVI
   * @param {object} data the object containing AVI data
   */
  write(path) {
    const ctx = this.struct.write(this.ctx.data);

    // write the length of the main list
    ctx.buffer.writeUInt32LE(ctx.buffer.length - 8, 4);

    fs.writeFileSync(path, ctx.buffer);
  }

  /**
   * Replaces the frames inside the opened file with new frames.
   * @param {Frames} frames 
   */
  replaceFrames(frames) {
    if (!this.ctx) {
      throw new Error('file has not been parsed yet');
    }

    const videoFrames = frames.frames.filter(frame => frame.id.toLowerCase().endsWith('dc'));
    const audioFrames = frames.frames.filter(frame => frame.id.toLowerCase().endsWith('wb'));

    const parsed = this.ctx.data;

    // replace frame counts
    const hdrl = parsed.data.list0;
    hdrl.data.chnk0.ckData.TotalFrames = videoFrames.length;
    hdrl.data.list1.data.chnk0.ckData.Length = videoFrames.length;
    hdrl.data.list2.data.chnk0.ckData.Length = audioFrames.length;

    // replace frame indexes
    const structIndexEntries = this.getAVIIndexEntries(frames.frames.length);
    replaceMember(this.idx1, structIndexEntries, 'ckData');
    const idx1 = parsed.data.chnk4;
    idx1.ckData = frames.getIndexEntries();
    idx1.ckSize = structIndexEntries.SIZE;

    // replace frame data
    const structDataEntries = this.getAVIFrameEntries(frames.frames);
    replaceMember(this.movi, structDataEntries, 'data');
    const movi = parsed.data.list3;
    const dataEntries = frames.getDataEntries();
    movi.data = dataEntries.data;
    movi.listSize = dataEntries.size + 4;
  }

  /**
   * Builds up a struct of a given list inside the AVI file.
   * @param {Buffer} data buffer of the list
   * @param {*} depth 
   * @returns struct of the list, including sub-lists and sub-chunks
   */
  getListStruct(data, depth = 0) {
    const listName = data.slice(0, 4).toString();
    const listSize = data.readUInt32LE(4);
    const listType = data.slice(8, 12).toString();
    this.debug(`${'  '.repeat(depth)}${listName} ${listType}\t${listSize.toLocaleString()}`);

    const List = new Struct()
      .addMember(Struct.TYPES.STRING(4), 'list')
      .addMember(Struct.TYPES.UINT_LE, 'listSize')
      .addMember(Struct.TYPES.STRING(4), 'listType')
      .addMember(this.getListData(data.slice(12, 8 + listSize), depth), 'data');
      // .addMember(types.Buffer(listSize - 4), 'data'); // 4 = sizeof(listType)

    if (listType === 'movi') {
      this.movi = List;
    }

    return List;
  }

  /**
   * Builds up a struct of the data inside a given list.
   * @param {Buffer} buffer buffer of the list data
   * @param {*} depth 
   * @returns struct of the list data (sub-lists and sub-chunks)
   */
  getListData(buffer, depth) {
    const ListData = new Struct();

    let offset = 0, counter = 0;
    while (offset < buffer.length) {
      const type = buffer.slice(offset, offset + 4).toString();
      const size = buffer.slice(offset + 4).readUInt32LE();
      const data = buffer.slice(offset, offset + size + 8);

      if (type.toLowerCase() === 'list') {
        const List = this.getListStruct(data, depth + 1);
        ListData.addMember(List, `list${counter++}`);
      } else {
        this.debug(`${'  '.repeat(depth + 1)}CHNK ${type}\t${size.toLocaleString()}`);
        const Chunk = this.getChunkStruct(data);

        // add padding to chunk data
        offset += this.addPadding(Chunk, size);
        
        ListData.addMember(Chunk, `chnk${counter++}`);
      }

      // 8 = FOURCC + sizeof(ckSize or listSize)
      // the size of each chunk/list doesn't include the FOURCC
      // or the size of ckSize/listSize
      offset += size + 8;
    }

    return ListData;
  }

  /**
   * Builds up a struct of a given chunk.
   * @param {Buffer} data buffer of the chunk
   * @returns struct of the chunk data
   */
  getChunkStruct(data) {
    const chunkType = data.slice(0, 4).toString().toLowerCase();
    const chunkSize = data.readUInt32LE(4);

    const Chunk = new Struct()
      .addMember(Struct.TYPES.STRING(4), 'ckID')
      .addMember(Struct.TYPES.UINT_LE, 'ckSize')

    if (chunkType === 'idx1') {
      // const CK_DATA_OFFSET = 8;
      // Chunk.addArray(types.AVIINDEXENTRY, 'ckData', CK_DATA_OFFSET, entries, true);

      const entryCount = chunkSize / types.AVIINDEXENTRY.SIZE;
      Chunk.addMember(this.getAVIIndexEntries(entryCount), 'ckData');
      this.idx1 = Chunk;
    } else if (chunkType === 'avih') {
      Chunk.addMember(types.MainAVIHeader, 'ckData');
    } else if (chunkType === 'strh') {
      Chunk.addMember(types.AVIStreamHeader, 'ckData');

      const fccType = data.slice(8, 12).toString();
      this.lastSeenStreamType = fccType;
    } else if (chunkType === 'vprp') {
      // 40 = chunkType + chunkSize + FieldPerFrame offset
      const FieldPerFrame = data.readUInt32LE(40);

      Chunk.addMember(types.VideoPropHeader(FieldPerFrame), 'ckData');
    } else if (chunkType === 'strf' && this.lastSeenStreamType === 'auds') {
      const FormatTag = data.readUInt16LE(8);

      const WAVE_FORMAT_EXTENSIBLE = 0xFFFE;
      const WAVE_FORMAT_MPEG = 0x0050;
      const WAVE_FORMAT_MPEGLAYER3 = 0x0055;

      if (FormatTag === WAVE_FORMAT_EXTENSIBLE) {
        Chunk.addMember(types.WAVEFORMATEXTENSIBLE, 'ckData');
      } else if (FormatTag === WAVE_FORMAT_MPEG) {
        Chunk.addMember(types.MPEG1WAVEFORMAT, 'ckData');
      } else if (FormatTag === WAVE_FORMAT_MPEGLAYER3) {
        Chunk.addMember(types.MPEGLAYER3WAVEFORMAT, 'ckData');
      } else {
        Chunk.addMember(types.WAVEFORMATEX, 'ckData');
      }

    } else if (chunkType === 'strf' && this.lastSeenStreamType === 'vids') {
      Chunk.addMember(types.BITMAPINFOHEADER, 'ckData');
    } else {
      Chunk.addMember(types.Buffer(chunkSize), 'ckData');
    }

    return Chunk;
  }

  /**
   * Builds up a struct of new index entries inside `idx1`
   * from an intended number of entries into the new index.
   * @param {number} entryCount number of index entries
   * @returns struct representing every index list entry
   */
  getAVIIndexEntries(entryCount) {
    const entries = new Struct();

    for (let i = 0; i < entryCount; i++) {
      entries.addMember(types.AVIINDEXENTRY, `indexEntry${i}`);
    }

    return entries;
  }

  /**
   * Builds up a struct of the frame entries inside `movi`
   * from a list of given frames.
   * @param {Frames} frames the frames to create the new list from
   * @returns 
   */
  getAVIFrameEntries(frames) {
    const ListData = new Struct();

    for (let i = 0; i < frames.length; i++) {
      const chunkSize = frames[i].data.length;
      const Chunk = new Struct()
        .addMember(Struct.TYPES.STRING(4), 'ckID')
        .addMember(Struct.TYPES.UINT_LE, 'ckSize')
        .addMember(types.Buffer(chunkSize), 'ckData');

      const padding = this.addPadding(Chunk, chunkSize);
      if (padding > 0) {
        frames[i].padding = padding;
      }
      
      ListData.addMember(Chunk, `chnk${i}`);
    }

    return ListData;
  }
  
  /**
   * Parses the header flags.
   * @param {number} flag 
   * @returns 
   */
  static getHeaderFlags(flag) {
    return {
      AVIF_HASINDEX:        flag & 0x00000010,
      AVIF_MUSTUSEINDEX:    flag & 0x00000020,
      AVIF_ISINTERLEAVED:   flag & 0x00000100,
      AVIF_TRUSTCKTYPE:     flag & 0x00000800,
      AVIF_WASCAPTUREFILE:  flag & 0x00010000,
      AVIF_COPYRIGHTED:     flag & 0x00020000,
    };
  }

  /**
   * Parses the frame flags from the index entry.
   * @param {number} flag 
   * @returns 
   */
  static getIndexFlags(flag) {
    return {
      AVIIF_LIST:       flag & 0x00000001,
      AVIIF_TWOCC:      flag & 0x00000002,
      AVIIF_KEYFRAME:   flag & 0x00000010,
      AVIIF_FIRSTPART:  flag & 0x00000020,
      AVIIF_LASTPART:   flag & 0x00000040,
      AVIIF_MIDPART:    flag & 0x00000060,
      AVIIF_NOTIME:     flag & 0x00000100,
      AVIIF_COMPUSE:    flag & 0x0FFF0000,
    };
  }
};

export default AVIReader;
