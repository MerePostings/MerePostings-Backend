const devError = (err, res) => {
    res.status(err.statusCode).json({
        message: err.message,
        stackTrace: err.stack,
        err: err
    })
}

const prodError = (err, res) => {
    console.log(err)
    if(err.isOperational){
        res.status(err.statusCode).json({
            message: err.message
        })
    }else{
        res.status(500).json({
            message: "Something went wrong! Please try again later."
        })
    }
}

const handleError = (err, req, res, next) => {

    err.statusCode = err.statusCode || 500
    
    if(process.env.NODE_ENV === 'development'){
        devError(err, res)  
    }else{
        prodError(err, res)
    }
    
}

module.exports = handleError