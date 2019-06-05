require("dotenv").config();
const path = require("path");
const fs = require("fs");

const serveStatic = require("serve-static");
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

const testMode = process.env.TEST_MODE;

const cv = require("opencv4nodejs");
const FfmpegCli = require("./ffmpegCli");
const CameraSettingsController = require("./cameraSettings");

outputDir = "output";
const fullOutputDir = path.join(__dirname, outputDir);
if (!fs.existsSync(fullOutputDir)) {
  fs.mkdirSync(fullOutputDir);
}

const cameraSettings = new CameraSettingsController();
const ffmpeg = new FfmpegCli(fullOutputDir);

// Preview
var wCap;
const previewFps = 10;
var previewIntervalId;

function enablePreview() {
  if (ffmpeg.isPreviewing || ffmpeg.isRecording) {
    return;
  }

  console.debug("enabling preview");
  wCap = new cv.VideoCapture(0);
  wCap.set(cv.CAP_PROP_FRAME_HEIGHT, 200);
  // too large on purpose so that aspect ratio is maintained with above height
  wCap.set(cv.CAP_PROP_FRAME_WIDTH, 1000);

  ffmpeg.isPreviewing = true;
  sendFileList(); // TODO move this somewhere it actually makes sense in general

  previewIntervalId = setInterval(() => {
    const frame = wCap.read();
    const image = cv.imencode(".jpg", frame).toString("base64");
    io.emit("image", image);
  }, 1000 / previewFps);
}

function disablePreview(callback) {
  if (!ffmpeg.isPreviewing) {
    return;
  }

  console.debug("disabling preview");
  clearInterval(previewIntervalId);
  wCap.release();
  ffmpeg.isPreviewing = false;

  callback();
}

var recordingProcess;

function startRecording(name = "rec") {
  if (ffmpeg.isRecording || ffmpeg.isPreviewing) {
    return;
  }

  console.debug("starting record");
  recordingProcess = spawn(
    "/usr/bin/ffmpeg",
    ffmpeg.generateRecordingFfmpegArgs(name)
  );
  ffmpeg.isRecording = true;
  recordingProcess.stderr.on("data", data => console.debug(data.toString()));
}

function stopRecording(callback) {
  if (!ffmpeg.isRecording) {
    return;
  }

  console.debug("ending record");
  recordingProcess.kill();
  ffmpeg.isRecording = false;
  recordingProcess.on("exit", callback);
}

app.use("/", serveStatic(path.join(__dirname, "static")));
app.use("/download", serveStatic(fullOutputDir, { index: false }));

function sendFileList() {
  fs.readdir(fullOutputDir, (err, files) => {
    if (err) {
      return;
    } else {
      Promise.all(
        files.map(file => {
          return new Promise((resolve, reject) => {
            fs.stat(path.join(fullOutputDir, file), (e, fileStats) => {
              if (e) {
                reject(e);
              } else {
                resolve({
                  name: file,
                  size: fileStats.size,
                  birthtime: fileStats.birthtime,
                  allStats: fileStats
                });
              }
            });
          });
        })
      ).then(filesDetails => {
        // console.log("sending file list", );
        io.emit("fileList", { fileList: filesDetails });
      });
    }
  });
}

function sendCameraSettings() {
  io.emit("actualSettings", cameraSettings.settings);
}

io.on("connect", socket => {
  if (ffmpeg.isRecording) {
    socket.emit("recording");
  }

  socket.on("record", data => {
    console.log(data.fileName);
    if (!testMode) {
      disablePreview(() => ffmpeg.startRecording(data.fileName));
    }
    io.emit("recording");
  });

  socket.on("stop", data => {
    if (!testMode) {
      ffmpeg.stopRecording(enablePreview);
    }
    io.emit("stopping");
  });

  // TODO should probably be REST API instead
  socket.on("deleteFile", data => {
    console.log("deletion requested for", data.fileName);
    deleteFile(data.fileName);
  });

  socket.on("setSettings", data => {
    cameraSettings.settings = data;
    sendCameraSettings();
  });

  socket.on("defaultSettings", data => {
    cameraSettings.setToDefaultSettings();
    sendCameraSettings();
  });

  socket.on("getSettings", data => {
    sendCameraSettings();
  });

  socket.on("filesPlease", data => sendFileList());

  sendFileList();
  sendCameraSettings();
});

function deleteFile(fileName) {
  console.log("deleting", fileName);
  fs.unlink(path.join(fullOutputDir, fileName), err => {
    if (err) {
      console.error(
        "problem deleting file, maybe it doesn't exist: ",
        fileName
      );
    }

    sendFileList();
  });
}

const port = process.env.PORT || 5000;

if (!testMode) {
  enablePreview();
}
server.listen(port);
