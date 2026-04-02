/**
 * Global application configuration.
 */
export const AppConfig = {
  clans: {
    northern: {
      id: "northern",
      name: "Северный Клан",
      sources: [
        {
          id: "active",
          url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRM--2HCsjXrLhSY741apoOHT7qXfUb8iroWucX6Q3BrhaMj2-Y-kPh9zwXY3BOO1FQDLgZKgDSIbcc/pub?gid=0&single=true&output=csv",
        },
        {
          id: "archive",
          url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRVveQlX1lDjCZs3YmpSuHRtsQDtkYsp2YrTis8yQUk92or39MukxRNa6k-BrzHOBXFEKbTZRYMOhz-/pub?output=csv",
        },
      ],

      mapping: {
        searchableFields: ["id", "name", "nickname"],

        primary: {
          id: { column: ["ID", "id"], type: "string" },
          name: { column: ["Имя", "имя"], type: "string" },
          nickname: { column: ["Кличка", "кличка"], type: "string" },
          nameChain: { column: ["Цепь имён", "цепь имён"], type: "string" },
          avatarUrl: {
            column: ["Ссылка на окрас", "окрас"],
            type: "url",
            fallback: "http://d.zaix.ru/F6E6.png",
          },
          creationDate: {
            column: ["Создание аккаунта", "создание аккаунта"],
            type: "string",
          },
          rebirthDate: {
            column: ["Перерождение", "перерождение"],
            type: "string",
          },
        },

        sections: [
          {
            title: "Основная информация",
            fields: [
              {
                key: "rank",
                column: ["Звание", "звание"],
                type: "string",
                display: "badge",
              },
              {
                key: "gender",
                column: ["Пол", "пол"],
                type: "string",
                display: "badge",
              },
            ],
          },
          {
            title: "Клановые данные",
            fields: [
              {
                key: "totem",
                column: ["Тотем и его качество", "тотем, качество"],
                type: "string",
                display: "text",
              },
              {
                key: "lordok",
                column: ["Лордок", "лордок"],
                type: "url",
                display: "link",
              },
              {
                key: "socials",
                column: ["Ссылки на соцсети", "вконтакте"],
                type: "array",
                separator: ",",
                display: "links",
              },
            ],
          },
        ],
      },
    },
  },
};
