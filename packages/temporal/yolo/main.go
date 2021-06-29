package main

import "fmt"

func main() {
	arr := []int{1, 2, 3}

	for index, i := range arr {
		fmt.Println(i)

		if index < 2 {
			arr = append(arr, len(arr)+1)
		}
	}
}
