// import { createLogger, format, transports } from 'winston';
// import { appDateTime } from '../config/messages';
// import * as flatted from 'flatted';

// // Define log levels
// const customLevels = {
//   levels: {
//     error: 0,
//     warn: 1,
//     info: 2,
//     debug: 3
//   },
//   colors: {
//     error: 'red',
//     warn: 'yellow',
//     info: 'green',
//     debug: 'blue'
//   }
// };



// // Create logger
// const AppLogger = createLogger({
//   level: 'info',
//   levels: customLevels.levels,
//   format: format.combine(
//     format.timestamp({ format: appDateTime[0] }),
//     format.errors({ stack: true }),
//     format.splat(),
//     format.json()
//   ),
//   transports: [
//     new transports.Console({
//       format: format.combine(
//         format.colorize(),
//         format.printf(({ level, message, timestamp, ...data }) => {

//           let logMessage = `applog:{ level:${level}, message:${message}, logAt:${timestamp}`;
//           if (Object.keys(data).length > 0) {
//             const dataString = JSON.stringify(data, null, 2);
            
//             logMessage += `, data:\u001b[32m${dataString}\u001b[39m}`;
//           } else {
//             logMessage += ' }';
//           }
//           return logMessage;
//         })
//       )
//     })
//   ]
// });

// export default AppLogger;
import { createLogger, format, transports } from 'winston';
import { appDateTime } from '../config/messages';
import * as flatted from 'flatted';

// Define log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
  }
};

// Create logger
const AppLogger = createLogger({
  level: 'info',
  levels: customLevels.levels,
  format: format.combine(
    format.timestamp({ format: appDateTime[0] }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, ...data }) => {

          let logMessage = `applog:{ level:${level}, message:${message}, logAt:${timestamp}`;
          if (Object.keys(data).length > 0) {
            // Use flatted.stringify to handle circular references
            const dataString = flatted.stringify(data);  // Use flatted.stringify here
            
         //   logMessage += `, data:\u001b[32m${dataString}\u001b[39m}`;
          } else {
            logMessage += ' }';
          }
          return logMessage;
        })
      )
    })
  ]
});

export default AppLogger;
