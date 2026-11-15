const dialog=document.getElementById('planner-help');
document.getElementById('open-help').addEventListener('click',()=>dialog.showModal());
document.getElementById('close-help').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
