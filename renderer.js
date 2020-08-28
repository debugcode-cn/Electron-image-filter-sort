// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const remote = require('electron').remote;

var $ = require('jquery');
const fs = require('fs');
const path = require('path');
const OS = require('os');

const imageInfo = require('imageinfo');

const reg_images = /\.()/;

$(".btn-get-dir").on('click',function () {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(),{
        title: '请选择源目录',
        properties: [ 'openDirectory' ] 
    }).then((result)=>{
        if(!result.canceled){
            let path_get =  result.filePaths[0];
            $(".input-get").val(path_get);
        }
    })
});

$(".btn-save-dir").on('click',function () {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(),{
        title: '请选择目标目录',
        properties: [ 'openDirectory' ]
    }).then((result)=>{
        if(!result.canceled){
            let path_save =  result.filePaths[0];
            $(".input-save").val(path_save);
        }
    })
});


function getImgList(dir,images=[]){
    let list = fs.readdirSync(dir);
    for(let i = 0 ; i < list.length ; i ++){
        let name = list[i];
        let new_path = path.join(dir,name)
        if(fs.statSync(new_path).isDirectory()){
            getImgList(new_path,images);
        }else{
            let data = fs.readFileSync(new_path);
            let info = imageInfo(data);
            if(info.mimeType.match(/^image\//)){
                images.push({path:new_path,size:data.length});
                console.log("Data is type:", info.mimeType);
                console.log("  Size:", data.length, "bytes");
                console.log("  Dimensions:", info.width, "x", info.height);
            }
        }
    }
    return  images;
}

// 读取 path_get 中所有图片文件
$("#btn-run").on('click',function(ev){
    var btn_target = $(ev.target)
    if(btn_target.is('.disabled')){
        alert('执行中,请等待')
        return ;
    }

    btn_target.addClass('disabled');
    let path_get = $(".input-get").val();
    let path_save = $(".input-save").val();
    let state = fs.statSync(path_get);
    if(state.isDirectory()){
        let images = getImgList(path_get);
        // 从大到小排序
        images = images.sort((a,b)=>{
            if(a.size > b.size){
                return -1;
            }
            if(a.size < b.size){
                return 1;
            }
            return 0;
        });
        let file_name = 'sorted_image_path.txt';
        let file_stream = null;
        if(images.length){
            file_stream = fs.createWriteStream(path.join(path_save,file_name),{flags:'w+'});
        }
        let path_list = '';
        images.map((file)=>{
            file_stream.write(file.path + OS.EOL);
            path_list +=  file.path + OS.EOL
        })
        if(file_stream){
            file_stream.end();
        }
        $("#pathlist").html(path_list);
    }
    btn_target.removeClass('disabled');
})