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

      supplements: [
        {
          id: "points",
          url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBkNR0qvfj8mx5jyUMomn9KkhGC-1kJM3cAy8Zl4BBZaBDD3FljxvkT7s_XaPMcB_4EhvoB8eObRmY/pub?gid=0&single=true&output=csv",
          matchBy: ["ID", "id"],
          fields: [
            {
              key: "points",
              column: ["Сумма", "сумма"],
              label: "Баллы Ярких Огней",
              display: "stat",
              icon: "⭐",
              targetSection: "Клановые данные",
            },
          ],
        },
      ],

      tree: {
        url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTuuFBO2cTD6Ph66F_OAJHt8UmmXf8w1_NyBzMcJDLo6-J47S7WMNZ4FOhGW1qG0bB9Z-nxosd5j36o/pub?gid=1537864372&single=true&output=csv",
        mapping: {
          id: ["ID (без пробелов)"],
          birthDate: [
            "Дата рождения персонажа (Дата регистрации аккаунта или последняя дата перерождения - важно!)",
            "Дата рождения персонажа",
          ],
          motherId: ["ID матери (без пробелов)"],
          motherBirthDate: [
            "Дата рождения матери (Дата регистрации аккаунта или последняя дата перерождения - важно!)",
            "Дата рождения матери",
          ],
          fatherId: ["ID отца (без пробелов)"],
          fatherBirthDate: [
            "Дата рождения отца (Дата регистрации аккаунта или последняя дата перерождения - важно!)",
            "Дата рождения отца",
          ],
          avatarUrl: [
            "Ссылка на модельку/окрас (допускается лорный окрас, как в игровой)",
          ],
          forcedName: ["Насильно ввести имя Персонажа"],
          forcedMotherName: ["Насильно ввести имя Матери"],
          forcedFatherName: ["Насильно ввести имя Отца"],
        },
      },

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
