const Discord = require("discord.js");
const bot = new Discord.Client();
const ytdl = require("ytdl-core-discord");
const snoowrap = require("snoowrap");
const fs = require("fs");

bot.on("ready", function (evt) {
  bot.user.setActivity("Barbie and the Magic of Pegasus", { type: "WATCHING" });
});

const soundFiles = fs.readdirSync("./sound/");
const sounds = soundFiles.filter((file) => file.endsWith(".mp3") || file.endsWith(".wav"));
const soundsMap = sounds.map(function (val) {
  return val.substring(0, val.length - 4);
});

let dispatcher = null;
let botVoiceChannel = null;

function hexToRGB(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function hexToOLE(hex, opacity = 1) {
  let rgba = [...hexToRGB(hex), opacity];
  return (rgba[0] << 16) + (rgba[1] << 8) + rgba[2];
}

function randomHex() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function getMemes(numberOfMemes = 3, subReddit = "memes") {
  // meme image filter
  const whiteList = ["jpg", "jpeg", "png", "gif"];

  // create reddit client
  const r = new snoowrap({
    userAgent: "Mozilla/5.0",
    clientId: "",
    clientSecret: "",
    username: "",
    password: "",
  });

  // execute query
  return r.getRandomSubmission(subReddit);
}

bot.on("message", (message) => {
  if (!message.author.bot) {
    let msg = message.content;
    let userVoiceChannel = message.member.voiceChannel;

    // pelican commands
    if (msg.toLowerCase().startsWith("pelican ")) {
      const command = msg.split(" ")[1];

      // play audio
      let localAudioId = soundsMap.indexOf(command);
      let isRadio = command === "radio";
      if (
        localAudioId > -1 ||
        isRadio ||
        command.startsWith("https://www.youtube.com/") ||
        command.startsWith("https://youtu.be/")
      ) {
        if (userVoiceChannel) {
          botVoiceChannel = userVoiceChannel;

          userVoiceChannel
            .join()
            .then(async (connection) => {
              // local audio
              if (localAudioId > -1) {
                message.delete(1000);
                message.channel.send({
                  embed: {
                    color: hexToOLE(randomHex()),
                    title: message.member.user.tag.split("#")[0] + " is playing",
                    description: sounds[localAudioId],
                  },
                });
                dispatcher = connection.playFile("./sound/" + sounds[localAudioId]);
              }

              // radio
              else if (isRadio) {
                const radioURL = msg.split(" ")[2];
                if (radioURL === "") {
                  message.channel.send("Specify radio URL to play :eggplant:");
                } else {
                  dispatcher = connection.playStream(radioURL);
                }
              }

              // youtube
              else {
                dispatcher = connection.playOpusStream(await ytdl(command));
                let getinfo = await ytdl.getBasicInfo(command);
                let title = getinfo.videoDetails.title;
                let playingInfo = title.length < 50 ? title : title.substring(0, 70) + "...";
                message.delete(1000);
                message.channel.send({
                  embed: {
                    color: hexToOLE(randomHex()),
                    title: message.member.user.tag.split("#")[0] + " is playing",
                    description: playingInfo,
                    fields: [
                      {
                        name: "Link",
                        value: command,
                      },
                    ],
                  },
                });
              }

              dispatcher.on("end", (end) => {
                console.log("left channel");
                botVoiceChannel.leave();
                botVoiceChannel = null;
              });

              dispatcher.on("error", (err) => console.log(err));
            })
            .catch((err) => console.log(err));
        } else {
          message.channel.send("Join a voice channel :eggplant:");
        }
      }

      // pause audio
      else if (command === "pause") {
        if (!dispatcher.paused) {
          dispatcher.pause();
        } else {
          message.channel.send("Already paused :eggplant:");
        }
      }

      // resume audio
      else if (command === "resume") {
        if (dispatcher.paused) {
          dispatcher.resume();
        } else {
          message.channel.send("Already playing :eggplant:");
        }
      }

      // stop audio
      else if (command === "stop") {
        if (dispatcher !== null && !dispatcher.destroyed) {
          dispatcher.end();
        } else {
          message.channel.send("Not playing :eggplant:");
        }
      }

      // leave voice channel
      else if (command === "leave" && botVoiceChannel !== null) {
        try {
          botVoiceChannel.leave();
          botVoiceChannel = null;
        } catch (err) {
          //
        }
      }

      // memes
      else if (command === "meme") {
        getMemes()
          .fetch()
          .then(function meme(data) {
            const embed = new Discord.RichEmbed()
              .setTitle(data.title)
              .setColor(0x00ae86)
              .setDescription("Upvotes: " + data.ups.toLocaleString())
              .setImage(data.url);

            message.channel.send({ embed });
          });
      }

      // commands list
      else if (command === "help") {
        message.channel.send({
          embed: {
            color: hexToOLE(randomHex()),
            title: "PelicanOS commands",
            description: "Use prefix pelican",
            fields: [
              {
                name: "Sounds",
                value: soundsMap.join(", "),
              },
              {
                name: "YouTube",
                value: "Play YouTube audio, url must start with *https://www.youtube.com/* or *https://youtu.be/*",
              },
              {
                name: "Memes",
                value: "Use `pelican meme` to get random meme from Reddit",
              },
              {
                name: "General",
                value:
                  "*stop* - stops playing music\n*leave* - leave voice channel\n*pause* - pause music\n*resume* - resume playing music",
              },
            ],
          },
        });
      } else if (command === "chance") {
        let sliced = msg.slice(15, msg.length);
        //console.log(msg.slice(15, msg.length));

        message.channel.send({
          embed: {
            color: hexToOLE(randomHex()),
            title: "Chance " + sliced,
            description: "There is " + (Math.floor(Math.random() * 100) + 1) + "% chance " + sliced,
          },
        });
      }

      // unknown command
      else {
        message.channel.send("Unknown command :eggplant:");
      }
    }

    // other
    if (msg.toLowerCase() === "donate") {
      message.channel.send(
        "Please donate to keep our pelican alive. Servers cost a lot of money! 💰\nhttps://paypal.me/pelicanbot"
      );
    }
  }
});

bot.login("");
