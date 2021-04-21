const cheerio = require('cheerio');
const cloudscraper = require('cloudscraper');
const {BASE_URL, BROWSE_URL, DETAIL_URL, IMAGE_URL,
  WATCH_URL, SEARCH_URL, GENRE_URL, GENRES, JIKAN_URL} = require('./util/urls')

const latestEpisodesAdded = async() =>{
  const res = await cloudscraper(BASE_URL , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];
  $('#tioanime > div > section:nth-child(1) > ul > li').each((index , element) =>{
    const $element = $(element);
    const master = $element.find('article a').attr('href').split('/')[2].split('-');
    const masterT = $element.find('article a h3.title').text().split(' ');
    masterT.pop();
    const episode = master.pop();
    const id = master.join('-');
    const title = masterT.join(' ');
    const preview = BASE_URL + $element.find('article a div.thumb figure img').attr('src');
    
    promises.push({
      id: id || null,
      title: title || null,
      preview: preview || null,
      episode: episode || null,
    })
  })
  return await Promise.all(promises);
};

const latestAnime = async() =>{
  const promises = [];
  for(let i=1; i<5; i++){
    const res = await cloudscraper(`${BROWSE_URL}&p=${i}` , {method: 'GET'});
    const body = await res;
    const $ = cheerio.load(body);
    $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
      const $element = $(element);
      const id = $element.find('article a').attr('href').replace('/anime/', '');
      const title = $element.find('article a h3.title').text();
      const poster = BASE_URL+$element.find('article a div.thumb figure img').attr('src');

      promises.push({
        id: id || null,
        title: title || null,
        poster: poster || null,
      })
    })
  }
  return Promise.all(promises);
};

const latestAnimeDetail = async() =>{
  const promises = [];
  for(let i=1; i<5; i++){
    const res = await cloudscraper(`${BROWSE_URL}&p=${i}` , {method: 'GET'});
    const body = await res;
    const $ = cheerio.load(body);
    $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
      const $element = $(element);
      const id = $element.find('article a').attr('href').replace('/anime/', '');
      promises.push(getAnimeInfo(id).then(async info => (info[0])))
    })
  }
  return Promise.all(promises);
};

const getAnimeInfo = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];

  const title = $('#tioanime > article > div > div > aside.col.col-sm-8.col-lg-9.col-xl-10 > h1.title').text();
  const poster = BASE_URL + $('#tioanime > article > div > div > aside.col.col-sm-4.col-lg-3.col-xl-2 > div > figure > img').attr('src');
  const banner = BASE_URL + $('#tioanime > article > figure > img').attr('src');
  const synopsis = $('#tioanime > article > div > div > aside.col.col-sm-8.col-lg-9.col-xl-10 > p.sinopsis').text().replace(/\n/g,'');
  const debut = $('#tioanime > article > div > div > aside.col.col-sm-4.col-lg-3.col-xl-2 > div > a').text();
  const type = $('#tioanime > article > div > div > aside.col.col-sm-8.col-lg-9.col-xl-10 > div.meta > span.anime-type-peli').text();
  const genres = [];

  $('#tioanime > article > div > div > aside.col.col-sm-8.col-lg-9.col-xl-10 > p.genres > span').each((index, element) => {
    const $element = $(element);
    const genre = $element.find('a').text()
    genres.push(genre);
  });

  let nextEpisode;
  $('body > script:nth-child(21)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && JSON.parse(x.data.match(/var anime_info = (\[.*?\])/)[1]);
      nextEpisode = info[3];
  });

  let malId;
  $('body > script:nth-child(20)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && x.data.match(/axios.get(\(.*?\))/)[1];
      malId = info.split('/')[5].replace("')",'');
  });

  promises.push(getAnimeEpisodes(id).then(episodes => ({
    id: id,
    malId: malId || null,
    title: title || null,
    poster: poster || null,
    banner: banner || null,
    synopsis: synopsis || null,
    debut: debut || null,
    type: type || null,
    genres: genres || null,
    nextEpisode: nextEpisode || null,
    episodes: episodes,
  })));

  return Promise.all(promises);
};

const getAnimeRelated = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];
  
  $('#tioanime > div > div > aside.sidebar.col-12 > div > section > ul > li').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('article div.thumb a').attr('href').replace('/anime/','');
    const title = $element.find('article div.media-body a h3.title').text();
    let poster = BASE_URL + $element.find('article div.thumb a figure img').attr('src');

    promises.push({
      id: id || null,
      title: title || null,
      poster: poster || null,
    })
  })
  return Promise.all(promises);
};

const getAnimeEpisodes = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const body = await res;
  const promises = [];
  const $ = cheerio.load(body , {xmlMode: false});
  $('body > script:nth-child(21)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && JSON.parse(x.data.match(/var anime_info = (\[.*?\])/)[1]);
      const episodes =  x && JSON.parse(x.data.match(/var episodes = (\[.*?\])/)[1]);
      const episodes_detail =  x && JSON.parse(x.data.match(/var episodes_details = (\[.*?\])/)[1]);
      const id = info[1];
      const poster = IMAGE_URL + info[0] + '.jpg';

      episodes.map((index, i) => {
        promises.push({
          id: id || null,
          poster: poster || null,
          episode: index || null,
          date: episodes_detail[i] || null,
      })
    })
  });
  return await Promise.all(promises);
  
};

const getAnimeEpisodeServers = async(id, episode) =>{
  const res = await cloudscraper(`${WATCH_URL}${id}-${episode}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body , {xmlMode: false});
  const promises = [];

  var textNode = $('body > script')
    .map((i, x) => x.children[0])                              
    .filter((i, x) => x && x.data.match(/var videos = /)).get(0);

  const urls =  JSON.parse(textNode.data.match(/var videos = (\[.*?\;)/)[1].replace(';',''));
  urls.map((url) => {
    promises.push({
      server: url[0],
      url: url[1]
    })
  })

  return await Promise.all(promises);
};

const downloadAnimeEpisode = async(id, episode) =>{
  const res = await cloudscraper(`${WATCH_URL}${id}-${episode}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];
  $('#downloads > div > div > div.modal-body > div > table > tbody > tr').each((index , element) =>{
    const $element = $(element);
    const server = $element.find('td:nth-child(2)').text();
    const url = $element.find('td.text-center > a').attr('href');

    promises.push({
      server: server || null,
      url: url || null,
    })
  })
  return await Promise.all(promises.flat(1));
};

const search = async(query) =>{
  const res = await cloudscraper(`${SEARCH_URL}${query.replace(/ /g, '+')}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];

  $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('article a').attr('href').replace('/anime/','');
    const title = $element.find('article a h3.title').text();
    const poster = BASE_URL + $element.find('article a div.thumb figure img').attr('src');
   
    promises.push({
      id: id || null,
      title: title || null,
      poster: poster || null,
    })
  })
  return Promise.all(promises);
};

const searchDetail = async(query) =>{
  const res = await cloudscraper(`${SEARCH_URL}${query.replace(/ /g, '+')}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  const promises = [];

  $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('article a').attr('href').replace('/anime/','');
   
    promises.push(getAnimeInfo(id).then(async info => (info[0])))
  })
  return Promise.all(promises);
};

const getByGenre = async(genre, page) =>{
  const promises = [];
  const res = await cloudscraper(`${GENRE_URL}${GENRES[genre]}&year=1950%2C2021&status=2&sort=recent&p=${page}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('article a').attr('href').replace('/anime/','');
    const title = $element.find('article a h3.title').text();
    const poster = BASE_URL + $element.find('article a div.thumb figure img').attr('src');
   
    promises.push({
      id: id || null,
      title: title || null,
      poster: poster || null,
    })
  })
  
  return Promise.all(promises);
};

const getByGenreDetail = async(genre, page) =>{
  const promises = [];
  const res = await cloudscraper(`${GENRE_URL}${GENRES[genre]}&year=1950%2C2021&status=2&sort=recent&p=${page}` , {method: 'GET'});
  const body = await res;
  const $ = cheerio.load(body);
  $('#tioanime > div > div.row.justify-content-between.filters-cont > main > ul > li').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('article a').attr('href').replace('/anime/','');
   
    promises.push(getAnimeInfo(id).then(async info => (info[0])))
  })
  
  return Promise.all(promises);
};

const getAnimeExtraInfo = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const bodyId = await res;
  const $ = cheerio.load(bodyId);
  let malId;
  $('body > script:nth-child(20)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && x.data.match(/axios.get(\(.*?\))/)[1];
      malId = info.split('/')[5].replace("')",'');
  });

  const animeDetails = `${JIKAN_URL}${malId}`;
  const data = await cloudscraper.get(animeDetails);
  const body = Array(JSON.parse(data));
  const promises = [];
  
  body.map(doc =>{
    promises.push({
      malId: doc.mal_id,
      titleJapanese: doc.title_japanese,
      title: doc.title,
      source: doc.source,
      totalEpisodes: doc.episodes,
      status: doc.status,
      aired:{
        from: doc.aired.from,
        to: doc.aired.to,
        string: doc.aired.string.split('to')[0]  
      },
      duration: doc.duration,
      rating: doc.rating,
      rank: doc.rank,
      popularity: doc.popularity,
      members: doc.members,
      favorites: doc.favorites,
      premiered: doc.premiered,
      broadcast: doc.broadcast,
      producers:{
        names: doc.producers.map(x => x.name)
      },
      licensors:{
        names: doc.licensors.map(x => x.name)
      },
      studios:{
        names: doc.studios.map(x => x.name)
      },
      genres: doc.genres,
      openingThemes: doc.opening_themes,
      endingThemes: doc.ending_themes,
      trailer: doc.trailer_url,
    });
  });
  return Promise.all(promises);
};

const getAnimeEpisodesTitles = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const bodyId = await res;
  const $ = cheerio.load(bodyId);
  let malId;
  $('body > script:nth-child(20)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && x.data.match(/axios.get(\(.*?\))/)[1];
      malId = info.split('/')[5].replace("')",'');
  });

  const jikanEpisodesURL = `${JIKAN_URL}${malId}/episodes`;
  const data = await cloudscraper.get(jikanEpisodesURL);
  const body = JSON.parse(data).episodes;
  const promises = [];

  body.map(doc =>{
    let date = doc.aired.substring(0 , doc.aired.lastIndexOf('T'));
    promises.push({
      episode: doc.episode_id,
      title: doc.title,
      date: date
    });
  });

  return Promise.all(promises);
};

const getAnimeCharacters = async(id) =>{
  const res = await cloudscraper(`${DETAIL_URL}${id}` , {method: 'GET'});
  const bodyId = await res;
  const $ = cheerio.load(bodyId);
  let malId;
  $('body > script:nth-child(20)').map((i, x) => x.children[0])
    .filter((i, x) => {
      const info =  x && x.data.match(/axios.get(\(.*?\))/)[1];
      malId = info.split('/')[5].replace("')",'');
  });

  const jikanCharactersURL = `${JIKAN_URL}${malId}/characters_staff`;
  const data = await cloudscraper.get(jikanCharactersURL);
  let body = JSON.parse(data).characters;
  if(typeof body === 'undefined') return null;

  const charactersNames = body.map(doc => {
    return doc.name;
  });
  const charactersImages = body.map(doc =>{
    return doc.image_url;
  });
  const charactersRoles = body.map(doc =>{
    return doc.role
  });

  let characters = [];
  Array.from({length: charactersNames.length} , (v , k) =>{
    let name = charactersNames[k];
    let characterImg = charactersImages[k];
    let role = charactersRoles[k];
    characters.push({
      name: name,
      image: characterImg,
      role: role
    });
  });
  
  return Promise.all(characters);
};

module.exports = {
  latestEpisodesAdded,
  latestAnime,
  latestAnimeDetail,
  getAnimeInfo,
  getAnimeRelated,
  getAnimeEpisodes,
  getAnimeEpisodeServers,
  downloadAnimeEpisode,
  search,
  searchDetail,
  getByGenre,
  getByGenreDetail,
  getAnimeExtraInfo,
  getAnimeEpisodesTitles,
  getAnimeCharacters
};