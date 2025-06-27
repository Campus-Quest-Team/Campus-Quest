const app_name = 'supercoolfun.site'

export function buildPath(route:string) : string
{
    if(import.meta.env.MODE != 'development')
    {
        return 'http://' + app_name + ':5001/' + route;
    }
    else
    {
        return 'http://localhost:5001/' + route;
    }
}

export default buildPath;