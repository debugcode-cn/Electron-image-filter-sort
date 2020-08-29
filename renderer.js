// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const remote = require('electron').remote;

var $ = require('jquery');
const fse = require('fs-extra');
const path = require('path');
const OS = require('os');

const imageInfo = require('imageinfo');

const reg_images = /\.()/;

// 选择源文件路径
$(".btn-get-dir").on('click',function () {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(),{
        title: '请选择A目录',
        properties: [ 'openDirectory' ] 
    }).then((result)=>{
        if(!result.canceled){
            let path_get =  result.filePaths[0];
            $(".input-get").val(path_get);
        }
    })
});

// 选择过滤后地址文本保存目录
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

// 选择过滤后图片保存目录
$(".btn-filter-dir").on('click',function () {
    remote.dialog.showOpenDialog(remote.getCurrentWindow(),{
        title: '请选择B目录',
        properties: [ 'openDirectory' ]
    }).then((result)=>{
        if(!result.canceled){
            let path_filter =  result.filePaths[0];
            $(".input-filter").val(path_filter);
        }
    })
});

function formatSize(size){
    if(size >= 1024 && size < 1024 * 1024){
        return Math.ceil(size/1024) + 'KB'
    }
    if(size >= 1024 * 1024  && size < 1024 * 1024 * 1024 ){
        return Math.ceil(size/1024) + 'MB'
    }
    return size + 'B'
}
function getImgList(dir,images=[]){
    let list = fse.readdirSync(dir);
    for(let i = 0 ; i < list.length ; i ++){
        let name = list[i];
        let file_path = path.join(dir,name)
        if(fse.statSync(file_path).isDirectory()){
            getImgList(file_path,images);
        }else{
            let data = fse.readFileSync(file_path);
            let info = imageInfo(data);
            if(info.mimeType.match(/^image\//)){
                images.push({path:file_path,size:data.length,filename:name,text_size_ordered: formatSize(data.length) + '   ' + file_path});
                console.log("Data is type:", info.mimeType);
                console.log("  Size:", data.length, "bytes");
                console.log("  Dimensions:", info.width, "x", info.height);
            }
        }
    }
    return  images;
}

function copyImages(dir_from,dir_to,image_list){
    if(image_list.length == 0){return;}
    for(let i = 0; i < image_list.length ; i ++){
        let filename = image_list[i].filename;
        let path_src = image_list[i].path;
        let path_new = path_src.replace(dir_from,dir_to);
        image_list[i].path = path_new;
        console.log('path_new',path_new);
        fse.ensureDirSync(path_new.replace(filename,''));
        fse.createReadStream(path_src).pipe(fse.createWriteStream(path_new));
    }
    return image_list;
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
    let state = fse.statSync(path_get);
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
        let file_name = path.join(path_save,'sorted_image_path.txt') ;
        let file_stream = null;
        if(images.length){
            file_stream = fse.createWriteStream(file_name,{flags:'w+'});
            copyImages(path_get,path_save,images);
        }
        let path_list = '';
        images = images.map((file)=>{
            file_stream.write(file.text_size_ordered + OS.EOL);
            path_list +=  file.text_size_ordered + OS.EOL

            // 将文本路径改为B文件对应的路径
            file.path = file.path.replace(path_get,path_save);
            return file;
        })
        if(file_stream){
            file_stream.end();
        }
        $("#pathlist").html(path_list);
        remote.shell.showItemInFolder(file_name)
    }
    btn_target.removeClass('disabled');
})