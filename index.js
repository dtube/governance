const javalon = require('javalon')
const fs = require('fs')
const tag = 'music'
let activeLeaders = []
let two_third

// startup
generateIndex()
ideaToFunding(function() {
    addNewIdeas(function() {})
})

// setInterval(generateIndex, 60000)
// setInterval(ideaToFunding, 60000)
// setInterval(addNewIdeas, 60000)

function generateIndex() {
    let scannedFolders = 0
    let folders = [
        'ideas',
        'funding',
        'progress',
        'complete'
    ]
    let proposals = []

    for (let i = 0; i < folders.length; i++) {
        let folder = folders[i]
        let files = fs.readdirSync(folder)
        for (let y = 0; y < files.length; y++) {
            let text = fs.readFileSync('./'+folder+'/'+files[y]).toString()
            let lastLine = text.split('\n')[text.split('\n').length-1]
            let progress = lastLine.split('/')[0] / lastLine.split('/')[1]
            progress = Math.round(progress*100)/100

            proposals.push({
                id: files[y],
                author: text.split('\n')[1].split('## ')[1],
                title: text.split('\n')[0].split('# ')[1],
                progress: progress+'%',
                category: folder,
            })
        }
    }

    let index = fs.readFileSync('index.html').toString()
    let tbody = ''
    for (let i = 0; i < proposals.length; i++) {
        tbody += '<tr>'
        tbody += '<td>'+proposals[i].category+'</td>'
        tbody += '<td>'+proposals[i].author+'</td>'
        tbody += '<td>'+proposals[i].title+'</td>'
        tbody += '<td>'+proposals[i].progress+'</td>'
    }
    index = index.replace('##TBODY##', tbody)
    fs.writeFileSync('./public/index.html', index)
}

function ideaToFunding(cb) {
    javalon.getSchedule(function(err, leaders) {
        // list active leaders
        for (let i = 0; i < leaders.shuffle.length; i++)
            activeLeaders.push(leaders.shuffle[i].name)
    
        // compute 2/3+ threshold
        two_third = Math.ceil(activeLeaders.length * 2 / 3)
        if (two_third == activeLeaders.length * 2 / 3)
            two_third++
    
        // count leader votes for each current idea
        let files = fs.readdirSync('ideas')
        for (let i = 0; i < files.length; i++) {
            let filename = files[i]
            let text = fs.readFileSync('./ideas/'+files[i]).toString()
            let author = files[i].split('_')[0]
            let link = files[i].split('_')[1].split('.')[0]
            javalon.getContent(author, link, function(err, content) {
                let votedLeaders = []
                for (let y = 0; y < content.votes.length; y++)
                    if (activeLeaders.indexOf(content.votes[y].u) > -1)
                        votedLeaders.push(content.votes[y].u)
    
                text = text.split('\n')
                text[text.length-2] = 'Voted by: '+votedLeaders.join(', ')
                text = text.join('\n')
                fs.writeFileSync('./ideas/'+files[i], text)
    
                // if content passed the threshold, move it to funding
                if (votedLeaders.length >= two_third)
                    fs.rename('./ideas/'+filename, './funding/'+filename)
            })
        }
        cb()
    })
}

function addNewIdeas(cb) {
    if (!two_third) return
    let files = fs.readdirSync('ideas')
    javalon.getNewDiscussions(null, null, function(err, contents) {
        let newContents = []
        for (let i = 0; i < contents.length; i++) {
            if (contents[i].votes[0].tag === tag) {
                let newIdea = contents[i]
                let text = '# '
                text += newIdea.json.title+'\n'
                text += '## '+newIdea.author+'\n'
                text += '## https://d.tube/#!/v/'+newIdea.author+'/'+newIdea.link+'\n\n'
                text += newIdea.json.desc+'\n\n'
                text += 'Voted by: '+'\n'
                text += '0/'+two_third

                let filename = newIdea.author+'_'+newIdea.link+'.md'

                if (files.indexOf(filename) === -1)
                    fs.writeFileSync('./ideas/'+filename, text)
            }
        }
        cb()
    })
}