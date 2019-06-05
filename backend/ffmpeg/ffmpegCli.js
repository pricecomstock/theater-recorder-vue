const path = require("path");
const { spawn } = require("child_process");

// PREP
class Ffmpeg {
  constructor(outputDir) {
    this._outputDir = outputDir;

    this._audioDevice = process.env.AUDIO_DEVICE || "hw:1";
    this._videoDevice = process.env.VIDEO_DEVICE || "/dev/video0";

    this._delay = 0.55;
    this._recordFramerate = 24;
    this._previewFramerate = 12;

    this._isRecording = false;
    this._isPreviewing = false;

    this._recordingProcess;
  }
  // TODO parameterize the rest of these args
  generateRecordingFfmpegArgs(label) {
    const name = label || "recording";

    const localeString = new Date(Date.now()).toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const timestamp = localeString
      .toLowerCase()
      .replace(/ /g, "")
      .replace(/,/g, "_")
      .replace(/\//g, "-");
    const normalizedName = name
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .substring(0, 75);
    const outputPath = path.join(
      this._outputDir,
      `${timestamp}_${normalizedName}.mp4`
    );
    // DOCS: https://superuser.com/questions/982342/in-ffmpeg-how-to-delay-only-the-audio-of-a-mp4-video-without-converting-the-au
    // Delay one of the signals to fix sync
    const ffmpegArgs = [
      "-y", // overwrite

      "-f",
      "alsa",
      "-i",
      `${this._audioDevice}`, // audio

      "-f",
      "v4l2",
      "-framerate",
      `${this._recordFramerate}`,
      "-s",
      "1920x1080",
      "-pix_fmt",
      "h264",
      "-itsoffset",
      `${this._delay}`, // TODO use map commands to make it possible to delay video or audio
      "-i",
      `${this._videoDevice}`,
      "-codec:v",
      "copy",
      "-codec:a",
      "aac",
      // 'tcp://127.0.0.1:6000?listen=1'
      outputPath
    ];

    return ffmpegArgs;
  }

  startRecording(label) {
    if (this.isRecording || this._isPreviewing) {
      return;
    }

    console.debug("starting record");
    this._recordingProcess = spawn(
      "/usr/bin/ffmpeg",
      this.generateRecordingFfmpegArgs(label)
    );
    this._isRecording = true;
    this._recordingProcess.stderr.on("data", data =>
      console.debug(data.toString())
    );
  }

  stopRecording(callback) {
    if (!this.isRecording) {
      return;
    }

    console.debug("ending record");
    this._recordingProcess.kill();
    this._isRecording = false;
    this._recordingProcess.on("exit", callback);
  }

  get isRecording() {
    return this._isRecording;
  }
  get isPreviewing() {
    return this._isPreviewing;
  }

  set isRecording(value) {
    this._isRecording = value;
  }
  set isPreviewing(value) {
    this._isPreviewing = value;
  }
}

module.exports = Ffmpeg;
