from json import load
from os.path import exists
from json import dump

def get_stub_job_id(stub: str, path_stub_job_id_mapping: str):
    if not exists(path_stub_job_id_mapping):
        mapping = {stub: '1'}
        dump(mapping, open(path_stub_job_id_mapping, 'w+'), indent=2)
        return '1'
    
    else:
        mapping = load(open(path_stub_job_id_mapping))
        if stub in mapping:
            return mapping[stub]
        else:
            job_id = str(len(mapping) + 1)
            mapping[stub] = job_id
            dump(mapping, open(path_stub_job_id_mapping, 'w+'), indent=2)
            return job_id

