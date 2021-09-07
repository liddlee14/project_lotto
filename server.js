/*로또 홈페이지 개발환경 구축*/
var http =require("http");
var express=require("express");
var static = require("serve-static");//정적자원 처리 외부모듈
var ejs= require("ejs");
var oracledb=require("oracledb");
var mymodule=require("./lib/mymodule");
var expressSession=require("express-session");//서버측 세션을 관리하는 모듈

var con;




oracledb.getConnection({
    user: "c##bugda",
    password: "1234",
    host: "localhost", 
    database: "XE",
    multipleStatements: true
}, 
    function (err, conn) {
        if(err){
            console.log('접속 실패', err);
            return;
        }
        console.log('접속 성공');
        con=conn;
        

});


var app = express();
app.use(static(__dirname+"/static"));//정적자원의 최상위 루트를 설정
app.use(express.urlencoded({
    extended:true
}));//post 요청의 파라미터 받기 위함



//세션 설정
app.use(expressSession({
    secret:"key secret",       //데이터 주고 받을때 보안처리하는 속성
    resave:true,                  //매 req마다 세션을 계속 다시 저장
    saveUninitialized:true     //session을 강제로 저장
}));

app.set("view engine","ejs");

//로그인 폼요청
app.get("/loginform",function(req,res){
    res.render("login");    
});



//회원가입 폼 요청

app.get("/signup",function(req,res){
    var sql="select * from client";
    var idCheck=[];
    con.execute(sql,function(err,result){
        for(var i=0;i<result.rows.length;i++){
            idCheck[i]=result.rows[i][1];
        }  
        if(err){
            console.log("signup",err);
        }else{
            console.log("signup",result);
            res.render("signup",{
                param:{
                    "id":idCheck

                }
            
            });

        }
    })

});

//구매 폼 요청

app.get("/purchase",function(req,res){
    checkSession(req,res,"purchase")
});

app.get("/auto",function(req,res){
    checkSession(req,res,"auto")
});

app.get("/buylotto",function(req,res){
    checkSession(req,res,"buylotto");
});



//로그인 요청 처리
//로그인 요청 처리
app.post("/login",function(req,res){
    var user_id=req.body.user_id;
    var pass=req.body.pass;
    //console.log(user_id);
    // console.log(pass);
    
    var sql="select * from client where user_id=:user_id and pass=:pass";
    con.execute(sql ,[user_id,pass],function(err,result, fields){
        //field는 칼럼
        oracledb.autoCommit=true
        if(err){
            console.log("조회 실패"); 
            console.log(err);
        }else{
            
            if(result.rows.length<1){ 
                console.log("로그인 실패");
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                res.end(mymodule.getMsgBack("로그인 정보가 올바르지 않습니다."));
                
            }else{
                req.session.user={
                    client_id:result.rows[0][0],
                    user_id:result.rows[0][1],
                    pass:result.rows[0][2],
                    name:result.rows[0][3],
                    birth:result.rows[0][4],
                    phone:result.rows[0][5]
                };
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});  
                res.end(mymodule.getMsgUrl("로그인 성공","/info"));
                
            }
        }
        
    });
});
//로그아웃
app.get("/logout",function(req,res){
    if(req.session.user){
        req.session.destroy(function(err){
            if(err) throw err;
            res.redirect("/loginform");
        });
    }
});
//메인페이지
app.get("/info",function(req,res){
   
    checkSession(req,res,"info")   
});

//당첨결과 페이지
app.get("/winresult",function(req,res){
    var user_id=req.session.user.user_id;
    var sql="select * from winnum";

    var buynum1=[];
    var buynum2=[];
    var buynum3=[];
    var buynum4=[];
    var buynum5=[];
    var buynum6=[];
    con.execute(sql,function(err,result,fields){
        if(err){
            console.log(err);
        }else{
            console.log("what? ",result);
            

            sql="select * from buylotto where user_id=:user_id";
            oracledb.autoCommit=true
            con.execute(sql,[user_id],function(error,record){
                for(var i=0;i<record.rows.length;i++){
                    buynum1[i]=record.rows[i][2];
                    buynum2[i]=record.rows[i][3];
                    buynum3[i]=record.rows[i][4];
                    buynum4[i]=record.rows[i][5];
                    buynum5[i]=record.rows[i][6];
                    buynum6[i]=record.rows[i][7];
                }
                //console.log("record: ",record.rows[1]);
                
                res.render("winresult",{
                   
                    clientUser:req.session.user,
                    param:{
                        
                       "win1":result.rows[0][2],
                       "win2":result.rows[0][3],
                       "win3":result.rows[0][4],
                       "win4":result.rows[0][5],
                       "win5":result.rows[0][6],
                       "win6":result.rows[0][7],
                        
                       
                       "num1":buynum1,
                       "num2":buynum2,
                       "num3":buynum3,
                       "num4":buynum4,
                       "num5":buynum5,
                       "num6":buynum6


                    }
                });
            })
        
        }
    });
})

//당첨번호 생성
    app.post("/info",function(req,res){
        var num1=req.body.num1;
        var num2=req.body.num2;
        var num3=req.body.num3;
        var num4=req.body.num4;
        var num5=req.body.num5;
        var num6=req.body.num6;
        
        var sql="delete from winnum";
        var sql2="insert into winnum(win_id,num1,num2,num3,num4,num5,num6)";
        sql2+=" values(seq_win.nextval,:num1,:num2,:num3,:num4,:num5,:num6)";
        
        con.execute(sql,function(err,result,fields){
            if(err){
                console.log(err);
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("error"));
            }else{
                //console.log("result: ",result);
            }
        });
        con.execute(sql2,[num1,num2,num3,num4,num5,num6],function(err,result,fields){
            if(err){
                console.log(err);
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                response.end(mymodule.getMsgBack("생성 오류"));
            }else{
                //console.log("result: ",result);
            }
        });
    })


app.post("/join",function(req,res){
    var user_id=req.body.user_id;
    var pass=req.body.pass;
    //var rpw=req.body.rpw;
    var name=req.body.name;
    var birth=req.body.birth;
    var phone=req.body.phone;

    var sql="insert into client(client_id,user_id,pass,name,birth,phone) values(seq_client.nextval,:user_id,:pass,:name,:birth,:phone)";
    oracledb.autoCommit=true
    con.execute(sql,[user_id,pass,name,birth,phone],function(err,result,fields){
        if(err){
            console.log(err);
            res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
            res.end(mymodule.getMsgBack("회원가입 실패"));
        }else{
            console.log("result는",result);
            res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
            res.end(mymodule.getMsgUrl("회원가입 성공","/loginform"));
        }
    })
})

    //자동 구매 페이지 
    app.post("/auto_buy",function(req,res){
        var user_id=req.body.user_id;
        var num1=req.body.num1;
        var num2=req.body.num2;
        var num3=req.body.num3;
        var num4=req.body.num4;
        var num5=req.body.num5;
        var num6=req.body.num6;

        var sql="insert into buylotto(buy_id,user_id,num1,num2,num3,num4,num5,num6)";
        sql+=" values(seq_buy.nextval,:user_id,:num1,:num2,:num3,:num4,:num5,:num6)";
        oracledb.autoCommit=true
        con.execute(sql,[user_id,num1,num2,num3,num4,num5,num6],function(err,result,fields){
            if(err){
                console.log(err);
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                res.end(mymodule.getMsgBack("구매 실패"));
            }else{
                console.log("result는",result);
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                res.end(mymodule.getMsgUrl("구매완료","/purchase"));
            }
        })
    })

    //수동구매 페이지
    app.post("/purchase",function(req,res){
        var user_id=req.session.user.user_id;
        var num1=req.body.num1;
        var num2=req.body.num2;
        var num3=req.body.num3;
        var num4=req.body.num4;
        var num5=req.body.num5;
        var num6=req.body.num6;

        var sql="insert into buylotto(buy_id,user_id,num1,num2,num3,num4,num5,num6)";
        sql+=" values(seq_buy.nextval,:user_id,:num1,:num2,:num3,:num4,:num5,:num6)";
        oracledb.autoCommit=true
        con.execute(sql,[user_id,num1,num2,num3,num4,num5,num6],function(err,result,fields){
            if(err){
                console.log(err);
                res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                res.end(mymodule.getMsgBack("구매 실패"));
            }else{
                //console.log("result는",req.session.user.user_id);
                res.render("purchase",{
                    clientUser:req.session.user
                })
                // res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
                // res.end(mymodule.getMsgUrl("구매완료","/purchase"));
            }
        });
    })

  //고객센터
  app.get("/cs", function(req, res){
    var currentPage = 1; //기본적인 페이지 디폴트 값은 1로 한다..

    //누군가가 페이지 아래 링크를 눌렀다면,, currentPaget 파라미터가 넘어온다..
    if(req.query.currentPage!=undefined){
        currentPage=req.query.currentPage;
    }

    var sql = "select * from cs";
    oracledb.autoCommit=true
    con.execute(sql,  function(err, result, fields){
        if(err){
            console.log("목록 불러오기 실패"+err);
        } else{
           
           
            res.render("cs",{
                clientUser:req.session.user,
                param:{
                   
                    "currentPage":currentPage,
                    "record":result.rows
                   
                }             
            });
        }

    });
})


app.get("/writeCs", function(req, res){
checkSession(req,res,"writeCs");


})

app.get("/readCs", function(req, res){

var cs_id=req.query.cs_id;

var sql = "select * from cs where cs_id="+cs_id;
oracledb.autoCommit=true
con.execute(sql,function(err, result, fields){
    if(err){
        console.log("내용 불러오기 실패"+err);
    } else{
       console.log(result);
       
        res.render("readCs",{
            clientUser:req.session.user,
            
                "cs":result.rows[0]
               
            
        });
    }
    
   
});
})

app.post("/uploadCs",function(req,res){
var cs_title=req.body.cs_title;
var user_id=req.body.user_id;
var cs_content=req.body.cs_content;


var sql="insert into cs(cs_id,user_id,cs_title, cs_content) values(seq_cs.nextval,:user_id,:cs_title,:cs_content)";

oracledb.autoCommit=true
con.execute(sql,[user_id, cs_title, cs_content],function(err,result,fields){
    if(err){
        console.log(err);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgBack("글 등록 실패"));
    }else{
        console.log("result는",result);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgUrl("글 등록 성공","/cs"));
    }
})
})

app.post("/editCs",function(req,res){
var cs_title=req.body.cs_title;
var cs_id=req.body.cs_id;
var cs_content=req.body.cs_content;


// var sql="update cs set cs_title='"+cs_title+"', cs_content='"+cs_content+"' where cs_id="+cs_id;
var sql="update cs set cs_title=:cs_title, cs_content=:cs_content where cs_id=:cs_id";

oracledb.autoCommit=true
console.log(cs_title);
con.execute(sql, [cs_title, cs_content, cs_id], function(err,result,fields){
    if(err){
        console.log(err);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgBack("글 수정 실패"));
    }else{
        console.log("result는",result);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgUrl("빠른 시일내에 연락 드리겠습니다.","/cs"));
    }
})
})

app.post("/deleteCs",function(req,res){
var cs_id=req.body.cs_id;

var sql="delete from cs where cs_id="+cs_id;

oracledb.autoCommit=true
con.execute(sql,function(err,result,fields){
    if(err){
        console.log(err);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgBack("글 삭제 실패"));
    }else{
        console.log("result는",result);
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        res.end(mymodule.getMsgUrl("글 삭제 성공","/cs"));
    }
})
})
//마이페이지
app.get("/mypage",function(req,res){
    var user_id=req.session.user.user_id;
    var sql="select * from winnum";

    var buynum1=[];
    var buynum2=[];
    var buynum3=[];
    var buynum4=[];
    var buynum5=[];
    var buynum6=[];
    con.execute(sql,function(err,result,fields){
        if(err){
            console.log(err);
        }else{
            console.log("what? ",result);
            
            sql="select * from rank";
            con.execute(sql,function(err1,result1){
                if(err1){
                    console.log("rank",err1);
                }else{
                    console.log("rank",result1);
                                                  
                    sql="select * from buylotto where user_id=:user_id";
                    oracledb.autoCommit=true
                    con.execute(sql,[user_id],function(error,record){
                        for(var i=0;i<record.rows.length;i++){
                            buynum1[i]=record.rows[i][2];
                            buynum2[i]=record.rows[i][3];
                            buynum3[i]=record.rows[i][4];
                            buynum4[i]=record.rows[i][5];
                            buynum5[i]=record.rows[i][6];
                            buynum6[i]=record.rows[i][7];
                        }
                        //console.log("record: ",record);
                        
                        res.render("mypage",{
                            clientUser:req.session.user,
                            param:{
                                
                                "win1":result.rows[0][2],
                                "win2":result.rows[0][3],
                                "win3":result.rows[0][4],
                                "win4":result.rows[0][5],
                                "win5":result.rows[0][6],
                                "win6":result.rows[0][7],
                                "date":result.rows[0][1],
                                
                                "num1":buynum1,
                                "num2":buynum2,
                                "num3":buynum3,
                                "num4":buynum4,
                                "num5":buynum5,
                                "num6":buynum6
                                
                            },
                            
                            buynum:record.rows,
                            rank:result1.rows
                         
        
                        });
                    })
                }
            });

        
        }
    });











});


//세션 체크
function checkSession(req,res,url){
    if(req.session.user){
        //정상적인 url 랜더링..
        res.render(url,{
            clientUser:req.session.user
        });
    }else{
        res.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
        response.end(mymodule.getMsgBack("관리자 인증이 필요한 서비스입니다."));
    
    }
}


var server = http.createServer(app);
server.listen(7777,function(){
    console.log("server is running at 7777....");
});