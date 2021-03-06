const config = require('./config')
const lib = require('./lib')
const chalk = require('chalk')
const Progress = require('./progress')

class ProcessRelated {
  constructor () {
    this.data_directory = './data/author_subreddits/'

    this.author_object = {}
    this.author_array = {}
    this.subreddit_object = {}
    this.subreddit_array = {}
  }

  start (json_output_chain) {
    return new Promise((resolve, reject) => {
      this.loadParseCSV().catch(err => {console.error(err)}).then(() => {
        console.log(`Loaded csv ${chalk.cyanBright(lib.memoryUsed())} ${chalk.redBright(lib.stopwatch())}`)
        this.writeSubreddits(json_output_chain)
        setTimeout(() => {resolve(true)}, 0)
      })
    })
  }

  loadParseCSV () {
    return lib.loadDirectoryParsed(this.data_directory, line => {
      let {author, subreddit} = line

      let a_c = author.charAt(0)
      let s_c = subreddit.charAt(0)

      if (typeof this.subreddit_object[s_c] !== 'object') {
        this.subreddit_object[s_c] = {}
        this.subreddit_array[s_c] = []
      }
      if (typeof this.author_object[a_c] !== 'object') {
        this.author_object[a_c] = {}
        this.author_array[a_c] = []
      }

      if (typeof this.subreddit_object[s_c][subreddit] !== 'object') {
        this.subreddit_object[s_c][subreddit] = {nm: subreddit, cmt: 0}
        this.subreddit_array[s_c].push(this.subreddit_object[s_c][subreddit])
      }

      if (typeof this.author_object[a_c][author] !== 'object') {
        this.author_object[a_c][author] = {n: author, sub: []}
        this.author_array[a_c].push(this.author_object[a_c][author])
      }

      this.subreddit_object[s_c][subreddit].cmt++
      this.author_object[a_c][author].sub.push(this.subreddit_object[s_c][subreddit])

    })
  }

  loopThroughSubredditsArray (processFunction) {
    // { nm: 'SaintPoitiersbourg', cmt: 2 }
    Object.keys(this.subreddit_array).forEach(letter => {
      this.subreddit_array[letter].forEach(sub => {
        processFunction(sub)
      })
    })
  }

  loopThroughAuthorsArray (processFunction) {
    // { sub: [ { nm: 'nanaimo', cmt: 65 }, {...} ] }
    Object.keys(this.author_array).forEach(letter => {
      this.author_array[letter].forEach(auth => {
        processFunction(auth)
      })
    })
  }

  ripThroughSubredditsArray (processFunction) {
    // { nm: 'SaintPoitiersbourg', cmt: 2 }
    Object.keys(this.subreddit_array).forEach(letter => {
      while (this.subreddit_array[letter].length > 0) {
        let subreddit = this.subreddit_array[letter].pop()
        processFunction(subreddit)
        delete this.subreddit_object[letter][subreddit.nm]
      }
    })
  }

  ripThroughAuthorsArray (processFunction) {
    // { sub: [ { nm: 'nanaimo', cmt: 65 }, {...} ] }
    Object.keys(this.author_array).forEach(letter => {
      while (this.author_array[letter].length > 0) {
        let author = this.author_array[letter].pop()
        processFunction(author)
        delete this.author_object[letter][author.n]
      }
    })
  }

  writeSubreddits (json_output_chain) {
  // Count
    let count_authors = 0
    this.loopThroughAuthorsArray(author => {
      count_authors++
    })
    let count_subreddits = 0
    this.loopThroughSubredditsArray(subreddit => {
      count_subreddits++
    })

    // Loop throuth authors
    console.log(`${count_authors} authors found ${chalk.yellowBright('start loop')}`)
    let update_every_x_lines_authors = Math.floor(count_authors / 1000)
    let bar_author = new Progress(` :bar ${chalk.greenBright(':percent')} ${chalk.cyanBright('Memory(:memory)')} ${chalk.magentaBright('ETA(:etas)')}`, {
      complete: chalk.bgGreen(' '),
      incomplete: chalk.bgWhite(' '),
      width: 50,
      renderThrottle: 0,
      total: count_authors
    })
    bar_author.tick(1, {memory: lib.memoryUsed()})

    let count_author_loops = 0
    this.ripThroughAuthorsArray(author => {
      // update bar
      count_author_loops++
      if (count_author_loops % update_every_x_lines_authors === 0) bar_author.tick(update_every_x_lines_authors, {memory: lib.memoryUsed()})

      // if (count_author_loops % update_every_x_lines_authors === 0) {
      //   stream.cursorTo(0);
      //   stream.write('' + (Math.floor((count_author_loops / count_authors) * 100)) + '%');
      //   // stream.clearLine();
      // }

      // do the main thing
      if (author.sub.length > config.skip_users_with_subs_greater_than) return false
      author.sub.forEach(subreddit => {
        if (subreddit.cmt < config.skip_subs_with_commenters_less_than) return false
        author.sub.forEach(sub => {
          if (sub.cmt < config.skip_subs_with_commenters_less_than) return false
          if (sub.nm == subreddit.nm) return false
          if (typeof subreddit['x_subs'] !== 'object') subreddit['x_subs'] = {}
          if (typeof subreddit.x_subs[sub.nm] !== 'object') subreddit.x_subs[sub.nm] = {x: 0, c: sub.cmt}
          subreddit.x_subs[sub.nm].x++
        })
      })
    })
    bar_author.update(count_authors, {memory: lib.memoryUsed()})
    console.log(`Done looping through authors ${chalk.cyanBright(lib.memoryUsed())} ${chalk.redBright(lib.stopwatch())}`)
    this.author_object = {}
    this.author_array = {}

    // Loop through subreddits
    console.log(`${count_subreddits} subreddits found ${chalk.yellowBright('start loop')}`)
    let update_every_x_lines_subreddits = Math.floor(count_subreddits / 1000)
    let bar_subreddit = new Progress(` :bar ${chalk.greenBright(':percent')} ${chalk.cyanBright('Memory(:memory)')} ${chalk.magentaBright('ETA(:etas)')}`, {
      complete: chalk.bgGreen(' '),
      incomplete: chalk.bgWhite(' '),
      width: 50,
      renderThrottle: 0,
      total: count_subreddits
    })
    bar_subreddit.tick(1, {memory: lib.memoryUsed()})

    let count_subreddit_loops = 0
    this.ripThroughSubredditsArray(subreddit => {
      // update bar
      count_subreddit_loops++
      if (count_subreddit_loops % update_every_x_lines_subreddits === 0) bar_subreddit.tick(update_every_x_lines_subreddits, {memory: lib.memoryUsed()})

      // do the main thing
      if (typeof subreddit['x_subs'] === 'undefined') return false // subreddit was under skip_subs_with_commenters_less_than

      // delete x_subs with only 1 user
      Object.keys(subreddit.x_subs).forEach(sub => {
        if (subreddit.x_subs[sub].x < config.delete_cross_subs_with_overlap_less_than) {
          delete subreddit.x_subs[sub]
        }
      })
      if(Object.keys(subreddit.x_subs).length <1) return false

      // load into array
      let x_subs_arr = []
      Object.keys(subreddit.x_subs).forEach(xsub => {
        subreddit.x_subs[xsub].s = xsub
        subreddit.x_subs[xsub].percent_child = this.percent(subreddit.x_subs[xsub].x, subreddit.x_subs[xsub].c)
        subreddit.x_subs[xsub].percent_parent = this.percent(subreddit.x_subs[xsub].x, subreddit.cmt)
        x_subs_arr.push(subreddit.x_subs[xsub])
      })
      // sort by child
      x_subs_arr.sort((a, b) => {
        if (a.percent_child === b.percent_child) return 0
        return a.percent_child > b.percent_child ? -1 : 1
      })
      // rank child
      x_subs_arr.forEach((xsub, index) => {
        xsub.rank_child = index
      })
      // sort by parent
      x_subs_arr.sort((a, b) => {
        if (a.percent_parent === b.percent_parent) return 0
        return a.percent_parent > b.percent_parent ? -1 : 1
      })
      // rank parent
      x_subs_arr.forEach((xsub, index) => {
        xsub.rank_parent = index
      })

      // merge ranks
      let x_subs_arr_length = x_subs_arr.length
      x_subs_arr.forEach(xsub => {
        xsub.percent_combined = ((this.percent(x_subs_arr_length - xsub.rank_child, x_subs_arr_length) + this.percent(x_subs_arr_length - xsub.rank_parent, x_subs_arr_length)) / 2)
      })
      // sort by combined
      x_subs_arr.sort((a, b) => {
        if (a.percent_combined === b.percent_combined) return 0
        return a.percent_combined > b.percent_combined ? -1 : 1
      })
      // rank combined
      x_subs_arr.forEach((xsub, index) => {
        xsub.rank_combined = index
      })



      // build response
      if (typeof json_output_chain[subreddit.nm] !== 'object') json_output_chain[subreddit.nm] = {}
      json_output_chain[subreddit.nm].subreddit = subreddit.nm
      json_output_chain[subreddit.nm].commenters = subreddit.cmt
      json_output_chain[subreddit.nm].x_subs = {
        subreddits: [],
        cross_commenters: [],
        commenters: [],
        // percent_child: [],
        // percent_parent: [],
        // percent_combined: [],
        rank_child: [],
        rank_parent: [],
        rank_combined: []
      }
      x_subs_arr.forEach(xsub => {
        if (xsub.rank_combined >= config.number_of_x_subs_per_subreddit
          && xsub.rank_parent >= config.number_of_x_subs_per_subreddit
          && xsub.rank_child >= config.number_of_x_subs_per_subreddit) return false
        json_output_chain[subreddit.nm].x_subs.subreddits.push(xsub.s)
        json_output_chain[subreddit.nm].x_subs.cross_commenters.push(xsub.x)
        json_output_chain[subreddit.nm].x_subs.commenters.push(xsub.c)
        // json_output_chain[subreddit.nm].x_subs.percent_child.push(xsub.percent_child)
        // json_output_chain[subreddit.nm].x_subs.percent_parent.push(xsub.percent_parent)
        // json_output_chain[subreddit.nm].x_subs.percent_combined.push(xsub.percent_combined)
        json_output_chain[subreddit.nm].x_subs.rank_child.push(xsub.rank_child)
        json_output_chain[subreddit.nm].x_subs.rank_parent.push(xsub.rank_parent)
        json_output_chain[subreddit.nm].x_subs.rank_combined.push(xsub.rank_combined)
      })
    })
    bar_subreddit.update(count_subreddits, {memory: lib.memoryUsed()})
    console.log(`Done looping through subreddits ${chalk.cyanBright(lib.memoryUsed())} ${chalk.redBright(lib.stopwatch())}`)
    this.subreddit_object = {}
    this.subreddit_array = {}
  }

  percent (small, big) {
    return (small / big) * 100
  }
}

module.exports = new ProcessRelated()
