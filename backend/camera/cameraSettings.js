// Camera settings
/*
                     brightness 0x00980900 (int)    : min=0 max=255 step=1 default=128 value=128
                       contrast 0x00980901 (int)    : min=0 max=255 step=1 default=128 value=128
                     saturation 0x00980902 (int)    : min=0 max=255 step=1 default=128 value=128
 white_balance_temperature_auto 0x0098090c (bool)   : default=1 value=1
                           gain 0x00980913 (int)    : min=0 max=255 step=1 default=0 value=0
           power_line_frequency 0x00980918 (menu)   : min=0 max=2 default=2 value=2
				0: Disabled
				1: 50 Hz
				2: 60 Hz
      white_balance_temperature 0x0098091a (int)    : min=2000 max=6500 step=1 default=4000 value=4000 flags=inactive
                      sharpness 0x0098091b (int)    : min=0 max=255 step=1 default=128 value=128
         backlight_compensation 0x0098091c (int)    : min=0 max=1 step=1 default=0 value=0
                  exposure_auto 0x009a0901 (menu)   : min=0 max=3 default=3 value=3
				1: Manual Mode
				3: Aperture Priority Mode
              exposure_absolute 0x009a0902 (int)    : min=3 max=2047 step=1 default=250 value=250 flags=inactive
         exposure_auto_priority 0x009a0903 (bool)   : default=0 value=1
                   pan_absolute 0x009a0908 (int)    : min=-36000 max=36000 step=3600 default=0 value=0
                  tilt_absolute 0x009a0909 (int)    : min=-36000 max=36000 step=3600 default=0 value=0
                 focus_absolute 0x009a090a (int)    : min=0 max=250 step=5 default=0 value=0 flags=inactive
                     focus_auto 0x009a090c (bool)   : default=1 value=1
                  zoom_absolute 0x009a090d (int)    : min=100 max=500 step=1 default=100 value=100

*/

// Inactive flag likely means it's overridden by auto

const { spawn } = require("child_process");

class CameraSettingsController {
  constructor() {
    // in order to support cameras besides C920 this should read from settings output
    this.setToDefaultSettings();
  }

  setToDefaultSettings() {
    this._cameraSettings = {
      brightness: this.createSettingObject(0, 255, 1, 128, 128),
      contrast: this.createSettingObject(0, 255, 1, 128, 128),
      saturation: this.createSettingObject(0, 255, 1, 128, 128),
      white_balance_temperature_auto: this.createSettingObject(0, 1, 1, 1, 1, {
        0: "manual",
        1: "auto"
      }),
      gain: this.createSettingObject(0, 255, 1, 0, 0),
      power_line_frequency: this.createSettingObject(0, 2, 1, 2, 2, {
        0: "disabled",
        1: "50 Hz",
        2: "60 Hz"
      }),
      white_balance_temperature: this.createSettingObject(
        2000,
        6500,
        1,
        4000,
        4000
      ),
      sharpness: this.createSettingObject(0, 255, 1, 128, 128),
      backlight_compensation: this.createSettingObject(0, 1, 1, 0, 0, {
        0: "off probably",
        1: "on probably"
      }),
      exposure_auto: this.createSettingObject(0, 3, 1, 3, 3, {
        1: "manual",
        3: "aperture priority"
      }),
      exposure_absolute: this.createSettingObject(3, 2047, 1, 250, 250),
      exposure_auto_priority: this.createSettingObject(0, 1, 1, 0, 1, {
        0: "idk 0",
        1: "idk 1"
      }),
      pan_absolute: this.createSettingObject(-36000, 36000, 3600, 0, 0),
      tilt_absolute: this.createSettingObject(-36000, 36000, 3600, 0, 0),
      focus_absolute: this.createSettingObject(0, 250, 5, 0, 0),
      focus_auto: this.createSettingObject(0, 1, 1, 1, 1, {
        0: "off",
        1: "on"
      }),
      zoom_absolute: this.createSettingObject(100, 500, 1, 100, 100)
    };

    this.applySettings();
  }

  createSettingObject(min, max, step, def, value, valueMap) {
    return {
      min,
      max,
      step,
      def,
      value,
      valueMap
    };
  }

  applySettings() {
    let settingsChangeArgs = [];
    for (let settingName in this._cameraSettings) {
      settingsChangeArgs.push("-c");
      settingsChangeArgs.push(
        `${settingName}=${this._cameraSettings[settingName].value}`
      );
    }
    let settingsChangeProcess = spawn("/usr/bin/v4l2-ctl", settingsChangeArgs);
    console.log("Applying settings:");
    console.table(this._cameraSettings);
    // we get some warning messages because of auto settings but it's not important
    // settingsChangeProcess.stdout.on('data', (data) => console.debug(data.toString()))
    // settingsChangeProcess.on('exit', () => {console.log("settings changed")})
  }

  setSetting(settingName, newValue) {
    let setting = this._cameraSettings[settingName];

    if (setting && newValue >= setting.min && newValue <= setting.max) {
      setting.value = newValue;
      this.applySettings();
    }
  }

  set settings(newSettings) {
    this._cameraSettings = newSettings;
    this.applySettings();
    // FIX zoom and pan and maybe some others don't take affect until second apply()
  }

  get settings() {
    return this._cameraSettings;
  }
}

module.exports = CameraSettingsController;
