# 🎓 Opiskelijaravintolat Web-sovellus

Kurssitehtävä: Toteutin web-sovelluksen, joka hakee ja näyttää suomalaisten opiskelijaravintoloiden päivän ja viikon ruokalistat REST API:n avulla.

## ✅ Toimii nämä:
- Päivän ja viikon ruokalistat
- Ravintolahaku ja -listaus
- Karttanäkymä, jossa lähin ravintola korostetaan
- Kirjautuminen & rekisteröityminen
- Suosikit
- Profiilisivu, jossa voi vaihtaa tietoja ja kuvan
- Tallennus localStorageen
- Teemavaihto (tumma/vaalea)

## 🧠 Koodin rakenne – huomio

Projekti on toteutettu yhdellä HTML-, CSS- ja JS-tiedostolla. Alussa oletin, ettei koodia tule niin paljon, mutta sovelluksen kasvaessa siitä muodostui suuri kokonaisuus. 
Tässä vaiheessa tiedostojen uudelleenrakentaminen ei ollut enää järkevää, joten jatkoin alkuperäisellä rakenteella.

## 🛠️ Teknologiat
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Ei frameworkeja tai kirjastoja

## 🔗 REST API
Sovellus käyttää Metropolian tarjoamaa REST APIa seuraaviin toimintoihin:

- Käyttäjän kirjautuminen (`/auth/login`)
- Ravintolalistauksen ja hakutoiminnon toteutus (`/restaurants`)
- Ravintolan tarkemmat tiedot (`/restaurants/:id`)
- Päivän ja viikon ruokalistat (`/restaurants/daily/:id/fi` ja `.../weekly/:id/fi`)
- Käyttö ei vaadi kirjautumista, paitsi sisäänkirjautumisessa.

Token tallennetaan localStorageen tulevaa käyttöä varten, mutta tällä hetkellä se ei ole käytössä muissa pyynnöissä.
