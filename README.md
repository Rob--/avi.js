# avi.js

Parse AVI files, modify frames and write new AVI files.

## Install

```
npm install avi.js
```

## Usage

```javascript
import AVIReader from './index.js';

const aviReader = new AVIReader('./video.avi');

const data = aviReader.read();
```

## Example

```javascript
const aviReader = new AVIReader('./video.avi');

const data = aviReader.read();

// create `Frames` object from parsed file
const Frames = AVIReader.getFrames(data);

// obtain all keyframes from `Frames` object
const keyframes = Frames.getKeyframes();

// duplicate every 5 keyframes
for (let i = 1; i < keyframes.length; i += 5) {
  keyframes[i].duplicate();
  // or: keyframes[i].delete()
}

// or randomise all frames...
// frames.getFrames().sort(() => 0.5 - Math.random());

// replace the frames in the loaded file with new ones
aviReader.replaceFrames(frames);

// write modified video to file
aviReader.write('./glitch.avi');
```

# AVIReader

```javascript
const aviReader = new AVIReader('./video.avi');

aviReader.read();
aviReader.write(path);
aviReader.replaceFrames(frames);

// static
AVIReader.getFrames(parsed);
```

## read()

**returns**: an object containing the parsed AVI file.

Obtains the file buffer and starts parsing it.

## write(path: *string*)
- **path**: string denoting the file path to write the AVI to.

Writes the loaded and potentially modified AVI to the given file.

## replaceFrames(frames: *Frames*)
- **frames**: replaces the frames inside the loaded AVI file with the given frames. Expects a `Frames` object.

## AVIReader.getFrames(parsed: *object*)
- **parsed**: obtains a `Frames` object from the parsed AVI file. Expects the structure returned from `read()`

## Parsed object

The `read()` function returns an object containing the parsed data.

An AVI file is made up of two primary structures:
- list: a list object can hold more lists, or chunks
- chunk: a chunk object holds data, such as headers, frame data, etc

This library denotes a list with the following object:
```javascript
{
  list: string, // usually just 'LIST'
  listSize: number, // size of list in bytes
  listType: string, // name of list
  data: object, // list data
}
```

Details:
- `list`: property is usually `LIST`, but the main file itself is represented as a list where the `list` property is `RIFF`.
- `listType`: property describes the data in the list, e.g. `strh` would denote the stream headers.
- `data`: property holds all the parsed data for the list elements. Usually chunks or more lists. Each element inside this object will be `chnk{n}` or `list{n}` where `n` denotes the index of the item in the list.

This library denotes a chunk with the following object:
```javascript
{
  chID: string, // chunk id
  ckSize: number, // size of chunk in bytes
  ckData: object, // list data
}
```

Details:
- `ckID`: property can be used for frame data to denote where it is an audio frame, or video frame, etc.
- `ckData`: property holds either a raw buffer (e.g. frame data) or parsed chunk data (an object).

An example of the structure returned from `read()`:
```javascript
{
  list: 'RIFF',
  listSize: 26622146,
  listType: 'AVI ',
  data: {
    list0: {
      list: 'LIST',
      listSize: 8906,
      listType: 'hdrl',
      data: [Object]
    },
    list1: {
      list: 'LIST',
      listSize: 26,
      listType: 'INFO',
      data: [Object]
    },
    chnk2: {
      ckID: 'JUNK',
      ckSize: 1016,
      ckData: <Buffer 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ... 966 more bytes>
    },
    list3: {
      list: 'LIST',
      listSize: 26419802,
      listType: 'movi',
      data: [Object]
    },
    chnk4: {
      ckID: 'idx1',
      ckSize: 192352,
      ckData: [Object]
    }
  }
}
```

# Frames

```javascript
const aviReader = new AVIReader('./video.avi');
const data = aviReader.read();
const Frames = AVIReader.getFrames(data);

Frames.getFrames();
Frames.getKeyframes();
```

## getFrames()

Returns a list of all frames.

## getKeyframes()

Returns a list of only keyframes.

# Frame

```javascript
const Frames = AVIReader.getFrames(data);

const frames = Frames.getFrames();
const first = frames[0];

first.duplicate();
first.delete();
```

## duplicate()

Duplicates the frame in place.

## delete()

Deletes the frame.

## Frame object

The `Frames` object holds an array of frames, each one is of the following structure:
```javascript
{
  id: string, // frame id
  size: number, // frame data size
  data: Buffer, // frame data
  flags: object, // frame flags
  _id: string, // ignore: internal library id
  delete: function, // call to delete frame
  duplicate: function, // call to duplicate frame
}
```

An example of a frame:
```javascript
{
  id: '01wb',
  size: 384,
  data: <Buffer ff fb 94 ... 381 more bytes>,
  flags: {
    AVIIF_LIST: 0,
    AVIIF_TWOCC: 0,
    AVIIF_KEYFRAME: 0,
    AVIIF_FIRSTPART: 0,
    AVIIF_LASTPART: 0,
    AVIIF_MIDPART: 0,
    AVIIF_NOTIME: 256,
    AVIIF_COMPUSE: 0
  },
  _id: '0_01wb_384',
  delete: [Function: delete],
  duplicate: [Function: duplicate]
}
```

---

## Sources

[MSDN - AVI RIFF File Reference](https://docs.microsoft.com/en-us/windows/win32/directshow/avi-riff-file-reference)

[hackaday.io - AVI File Format](https://cdn.hackaday.io/files/274271173436768/avi.pdf)

[jmcgowan.com - OpenDML AVI File Format Extensions](http://www.jmcgowan.com/odmlff2.pdf)