const imaps = require("imap-simple");
const fs = require("fs");
const csvWriter = require("csv-writer").createObjectCsvWriter;
const moment = require("moment");

// Нужный from
const sender = "***************";

// Конфиг на коннект
const config = {
  imap: {
    user: "*****************",
    password: "*********",
    host: "imap.yandex.ru",
    port: 993,
    tls: true,
    authTimeout: 6000,
  },
};

console.log(config.imap);

// Соединение с сервером
imaps
  .connect(config)
  .then(function (connection) {
    console.log("Успешно соединились с сервером!");
    // Открытие ящика Spam
    return connection
      .openBox("Spam")
      .then(function () {
        console.log("Успешно открыли ящик!");
        // Поиск по критериям в ящике
        const searchCriteria = [
          ["FROM", sender],
          ["SINCE", moment().subtract(7, "days").format("YYYY-MM-DD")],
        ];
        // Опции поиска
        const fetchOptions = {
          bodies: ["HEADER", "TEXT"],
          markSeen: true,
          struct: true,
        };
        // Поиск писем в ящике
        return connection
          .search(searchCriteria, fetchOptions)
          .then(function (messages) {
            console.log("Найдено " + messages.length + " писем");
            const csv = csvWriter({
              path: `./importCSV/feedback-${Date.now()}.csv`,
              header: [
                { id: "date", title: "Date" },
                { id: "from", title: "From" },
                { id: "sessionKey", title: "SessionKey" },
                { id: "url", title: "Url" },
                { id: "code", title: "Code" },
                { id: "status", title: "Status" },
              ],
            });

            const emails = messages.map(function (message) {
              const headers = message.parts.filter(
                (part) => part.which === "HEADER"
              )[0].body;
              const body = message.parts.filter(
                (part) => part.which === "TEXT"
              )[0].body;

              const sessionKey = body.match(/SessionKey: (.*)/)[1].trim();
              const url = body
                .match(/Url: (.*)/)[1]
                .trim()
                .replace(/^https?:\/\/[^\/]+/, "");
              const code = body.match(/Code: (.*)/)[1].trim();
              const status = body.match(/Status: (.*)/)[1].trim();

              return {
                date: headers.date[0],
                from: headers.from[0],
                sessionKey,
                url,
                code,
                status,
              };
            });

            return csv.writeRecords(emails);
          })
          .then(() => {
            console.log("The CSV file was written successfully");
          })
          .catch((error) => {
            console.error(error);
          });
      })
      .catch(function (error) {
        console.error("Ошибка открытия ящика:", error);
      });
  })
  .catch(function (error) {
    console.error("Ошибка соединения с сервером:", error);
  });