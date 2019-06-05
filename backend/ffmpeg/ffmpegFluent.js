const ffmpeg = require("fluent-ffmpeg");

// CONSTANTS
const delay = 0.55; // TODO use map commands to make it possible to delay video or audio
const audioDevice = process.env.AUDIO_DEVICE || "hw:1";
const videoDevice = process.env.VIDEO_DEVICE || "/dev/video0";
const framerate = 24;

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
  __dirname,
  `${outputDir}/${timestamp}_${normalizedName}.mp4`
);

// COMMANDS
const previewCommand = ffmpeg();

const recordCommand = ffmpeg()
  .input(videoDevice)
  .inputFPS(framerate)
  .setStartTime(0.55)
  .input(audioDevice)
  .output(outputPath);

// EXPORT
module.exports = {
  previewCommand,
  recordCommand
};

// recordCommand.run();
