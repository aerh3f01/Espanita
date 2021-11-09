/**
 * Module Imports
 */
const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { join } = require("path");
const { TOKEN, PREFIX } = require("./util/Util");
const i18n = require("./util/i18n");
const db = require("quick.db");



const client = new Client({
  disableMentions: "everyone",
  restTimeOffset: 0
});


client.on("ready", () => {
  console.log(`${client.user.username} ready!`);
  client.user.setActivity(`${PREFIX}help & ${PREFIX}play `, { type: 'WATCHING' })
  .then(presence => console.log(`${presence.activities[0].name}`))
  .catch(console.error);
  
  
  //client.user.setActivity('discord.js', {type: "WATCHING"});
  //const activity = client.user.setPresence(`${PREFIX}help y ${PREFIX}play`, {type: "Eschuchar"});
  //console.log(activity);
  
//   // client.user.setActivity(`${PREFIX}help y ${PREFIX}play`, { type: "Escuchar" });
});



// client.on('ready', () => {
//   console.log(`${client.user.username} ready`);
//       client.user.setStatus('online')
//       client.user.setPresence({
//           game: {
//               name: 'WORK DAMN IT',
//               type: "Playing",
//               url: "http://oppressive.games/power/"
//           }
//       });
//   });

client.login(TOKEN);
client.commands = new Collection();
client.prefix = PREFIX;
client.queue = new Map();
const cooldowns = new Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");



/**
 * Client Events
 */

client.on("warn", (info) => console.log(info));
client.on("error", console.error);

//Testing @<bot> implementation

client.on('message', async message => {


  let prefix;
      try {
          let fetched = await db.fetch(`prefix_${message.guild.id}`);
          if (fetched == null) {
              prefix = PREFIX
          } else {
              prefix = fetched
          }
      
          } catch {
          prefix = PREFIX
  };
  try {
      if (message.mentions.has(bot.user.id) && !message.content.includes("@everyone") && !message.content.includes("@here")) {
        message.channel.send(`\nMy prefix for \`${message.guild.name}\` is \`${prefix}\` Type \`${prefix}help\` for help`);
        }
        
  } catch {
      return;
  };

});

/**
 * Import all commands
 */


// console.log(`Loading commands...`);

readdirSync('./commands/').forEach(dirs => {
  const commands = readdirSync(`./commands/${dirs}`).filter(files => files.endsWith('.js'));

  for (const file of commands) {
      const command = require(`./commands/${dirs}/${file}`);
      console.log(`-> Loaded command ${command.name.toLowerCase()}`);
      client.commands.set(command.name.toLowerCase(), command);
      delete require.cache[require.resolve(`./commands/${dirs}/${file}`)];
  };
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(PREFIX)})\\s*`);
  if (!prefixRegex.test(message.content)) return;

  const [, matchedPrefix] = message.content.match(prefixRegex);

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command =
    client.commands.get(commandName) ||
    client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

  if (!command) return;

  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 1) * 1000;

  if (timestamps.has(message.author.id)) {
    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply(
        i18n.__mf("common.cooldownMessage", { time: timeLeft.toFixed(1), name: command.name })
      );
    }
  }

  timestamps.set(message.author.id, now);
  setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply(i18n.__("common.errorCommand")).catch(console.error);
  }
});
