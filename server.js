var http = require('http')
var fs = require('fs')
var url = require('url')
const { Session } = require('inspector')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
    }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/
    const session = JSON.parse(fs.readFileSync('./public/session.json').toString())
    console.log(session)
    console.log('有网页发请求过来啦！路径（带查询参数）为：' + pathWithQuery)

    if (path === '/home.html') {
        const cookie = request.headers["cookie"]
        let sessionId
        console.log(cookie)
        try {
            sessionId = cookie.split(';').filter(s => s.indexOf('session_id=') >= 0)[0].split('=')[1]
            console.log(sessionId)
        } catch (error) { }
        console.log(session[sessionId])
        if (sessionId && session[sessionId]) {
            console.log(session)
            const userId = session[sessionId].user_id
            const userArray = JSON.parse(fs.readFileSync('./DB/users.json'))
            const user = userArray.find(user => user.id === userId)
            console.log(user)
            console.log(user.name)
            const homeHtml = fs.readFileSync("./public/home.html").toString()
            let string
            if (user) {
                string = homeHtml.replace('{{username}}', user.name).replace('{{login}}', '已登录')
            } else {
                const string = homeHtml.replace('{{username}}', '抱歉').replace('{{login}}', '未登录')
            }
            response.write(string)
        } else {
            const homeHtml = fs.readFileSync("./public/home.html").toString()
            const string = homeHtml.replace('{{username}}', '抱歉111').replace('{{login}}', '未登录')
            response.write(string)
        }
        response.end();
    } else if (path === "/login" && method === "POST") {
        response.setHeader("Content-Type", "text/html;charset=utf-8")
        //读数据库
        const userArray = JSON.parse(fs.readFileSync('./DB/users.json'))
        const array = []
        //对data事件进行监听，就是监听上传事件,需要一个数组是因为上传数据可能不是一下子上传完，可能是一段一段的
        //把传过来的数据进行监听
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            // 拿到用户填写的用户名和密码
            const obj = JSON.parse(string)
            console.log(obj)
            //在users.json中查找是否有和用户传过来的数据一样的用户，有的话就返回第一个查找成功的元素的值
            const user = userArray.find(user => user.name === obj.name && user.password === obj.password)
            console.log(user)
            if (user === undefined) {
                response.statusCode = 400
                //531是自己定义的错误编码，多少都可以
                response.setHeader("Content-Type", "text/json;charset=utf-8")
                response.end(`{"errorCode":4001}`)
            } else {
                response.statusCode = 200
                //防止前端操作cookie
                const random = Math.random()
                const session = JSON.parse(fs.readFileSync('./public/session.json'))
                session[random] = { user_id: user.id }
                fs.writeFileSync('./public/session.json', JSON.stringify(session))
                response.setHeader('Set-Cookie', `session_id=${random};HttpOnly`)
            }
            response.end()
        })
    } else if (path === "/register" && method === "POST") {
        response.setHeader("Content-Type", "text/html;charset=utf-8")
        //读数据库
        const userArray = JSON.parse(fs.readFileSync('./DB/users.json'))
        const array = []
        //对data事件进行监听，就是监听上传事件,需要一个数组是因为上传数据可能不是一下子上传完，可能是一段一段的
        //把传过来的数据进行监听
        request.on('data', (chunk) => {
            array.push(chunk)
        })
        request.on('end', () => {
            const string = Buffer.concat(array).toString()
            console.log(typeof string)
            console.log(string)
            const obj = JSON.parse(string)
            console.log(typeof obj)
            console.log(obj)
            const lastUser = userArray[userArray.length - 1]
            const newUser = {
                id: lastUser ? lastUser.id + 1 : 1,
                name: obj.name,
                password: obj.password
            }
            userArray.push(newUser)
            fs.writeFileSync('./DB/users.json', JSON.stringify(userArray))
            response.end()

        })
    } else {
        response.statusCode = 200;
        const filePath = path === '/' ? '/index.html' : path
        const index = filePath.lastIndexOf('.')
        //suffix是后缀
        const suffix = filePath.substring(index)
        const fileTypes = {
            //哈希表
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript'
        }
        response.setHeader("Content-Type", `${fileTypes[suffix] || 'text/html'};charset=utf-8`);
        let content
        try {
            content = fs.readFileSync(`./public${filePath}`)
        } catch (error) {
            content = '文件不存在'
            response.statusCode = 404
        }
        response.write(content)
    }


    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请打开 http://localhost:' + port)